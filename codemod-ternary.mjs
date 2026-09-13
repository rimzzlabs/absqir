import ts from "typescript";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const PROJECTS = process.argv.slice(2);

const FALSY_FLAGS =
  ts.TypeFlags.String | ts.TypeFlags.Number | ts.TypeFlags.Boolean |
  ts.TypeFlags.BooleanLiteral | ts.TypeFlags.StringLiteral | ts.TypeFlags.NumberLiteral |
  ts.TypeFlags.BigInt | ts.TypeFlags.BigIntLiteral | ts.TypeFlags.Any | ts.TypeFlags.Unknown |
  ts.TypeFlags.Void | ts.TypeFlags.Never;

const BOOL_OPS = new Set([
  ts.SyntaxKind.LessThanToken, ts.SyntaxKind.GreaterThanToken,
  ts.SyntaxKind.LessThanEqualsToken, ts.SyntaxKind.GreaterThanEqualsToken,
  ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken,
  ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken,
  ts.SyntaxKind.InstanceOfKeyword, ts.SyntaxKind.InKeyword,
]);

const NULLISH = ts.TypeFlags.Null | ts.TypeFlags.Undefined;

const looksBoolean = (n) =>
  (ts.isPrefixUnaryExpression(n) && n.operator === ts.SyntaxKind.ExclamationToken) ||
  (ts.isBinaryExpression(n) && BOOL_OPS.has(n.operatorToken.kind)) ||
  n.kind === ts.SyntaxKind.TrueKeyword || n.kind === ts.SyntaxKind.FalseKeyword;

const isNullLit = (n) => n.kind === ts.SyntaxKind.NullKeyword;

/** An object literal in an arrow body parses as a block, so it needs parentheses. */
const bodyText = (node, src, text) => {
  const inner = text ?? node.getText(src);
  return ts.isObjectLiteralExpression(node) ? `(${inner})` : inner;
};

/** True when the branch still reads the bound name, so the parameter is not unused. */
function usesName(node, name) {
  let found = false;
  const walk = (n) => {
    if (found) return;
    if (ts.isIdentifier(n) && n.text === name) { found = true; return; }
    ts.forEachChild(n, walk);
  };
  walk(node);
  return found;
}

const TYPEOF_PATTERNS = {
  string: "P.string", number: "P.number", boolean: "P.boolean",
  bigint: "P.bigint", symbol: "P.symbol", function: "P.when((v) => typeof v === \"function\")",
};

/** Reads `typeof x === "number"` and `x instanceof C` back into a ts-pattern pattern. */
function narrowingOf(cond, src) {
  if (ts.isBinaryExpression(cond) &&
      (cond.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken ||
       cond.operatorToken.kind === ts.SyntaxKind.EqualsEqualsToken)) {
    const [l, r] = [cond.left, cond.right];
    const typeofSide = ts.isTypeOfExpression(l) ? l : ts.isTypeOfExpression(r) ? r : null;
    const litSide = ts.isStringLiteral(l) ? l : ts.isStringLiteral(r) ? r : null;
    if (typeofSide && litSide && TYPEOF_PATTERNS[litSide.text]) {
      return { subject: typeofSide.expression, pattern: TYPEOF_PATTERNS[litSide.text] };
    }
  }
  if (ts.isBinaryExpression(cond) && cond.operatorToken.kind === ts.SyntaxKind.InstanceOfKeyword) {
    return { subject: cond.left, pattern: `P.instanceOf(${cond.right.getText(src)})` };
  }
  return null;
}
const isUndefLit = (n) => ts.isIdentifier(n) && n.text === "undefined";

/** Rewrites every `a.b.c` inside `branch` that matches the condition to the bound name. */
function rebind(branch, condText, bind, src) {
  const spans = [];
  const walk = (n) => {
    if ((ts.isPropertyAccessExpression(n) || ts.isElementAccessExpression(n)) &&
        n.getText(src) === condText) {
      spans.push([n.getStart(src), n.getEnd()]);
      return;
    }
    ts.forEachChild(n, walk);
  };
  walk(branch);
  let text = branch.getText(src);
  const base = branch.getStart(src);
  for (const [s, e] of spans.reverse()) {
    text = text.slice(0, s - base) + bind + text.slice(e - base);
  }
  return text;
}

function plan(node, checker, src) {
  const cond = node.condition;
  const condText = cond.getText(src);
  const a = bodyText(node.whenTrue, src);
  const b = bodyText(node.whenFalse, src);

  // `typeof x === "number" ? ... : ...` loses its narrowing inside an arrow,
  // so it becomes a pattern on x instead of a boolean.
  const narrow = narrowingOf(cond, src);
  if (narrow) {
    const subjText = narrow.subject.getText(src);
    const bind = ts.isIdentifier(narrow.subject)
      ? narrow.subject.text
      : ts.isPropertyAccessExpression(narrow.subject) ? narrow.subject.name.text : null;
    if (bind) {
      const aBound = ts.isIdentifier(narrow.subject)
        ? a
        : bodyText(node.whenTrue, src, rebind(node.whenTrue, subjText, bind, src));
      return {
        kind: "narrow", subject: subjText, pattern: narrow.pattern,
        bind: usesName(node.whenTrue, bind) ? bind : null, a: aBound, b,
      };
    }
  }

  if (ts.isPropertyAccessExpression(cond) && cond.name.text === "length") {
    return { kind: "match", subject: `${condText} > 0`, a, b };
  }
  if (looksBoolean(cond)) return { kind: "match", subject: condText, a, b };

  const type = checker.getTypeAtLocation(cond);
  const parts = type.isUnion() ? type.types : [type];
  if (parts.every((p) => p.flags & (ts.TypeFlags.Boolean | ts.TypeFlags.BooleanLiteral))) {
    return { kind: "match", subject: condText, a, b };
  }

  const hasNullish = parts.some((p) => p.flags & NULLISH);
  const rest = parts.filter((p) => !(p.flags & NULLISH));
  const restIsTruthy = rest.length > 0 && rest.every((p) => !(p.flags & FALSY_FLAGS));
  const isRef = ts.isIdentifier(cond) || ts.isPropertyAccessExpression(cond);
  const bindOf = () =>
    ts.isIdentifier(cond) ? cond.text : ts.isPropertyAccessExpression(cond) ? cond.name.text : null;

  // A nullable string is truthy when it is present and not empty. P.string.minLength(1)
  // says exactly that, and it narrows the branch the way the ternary used to.
  const restIsString = rest.length > 0 && rest.every((p) => p.flags & (ts.TypeFlags.String | ts.TypeFlags.StringLiteral));
  if (restIsString && isRef) {
    const bind = bindOf();
    const aBound = ts.isIdentifier(cond)
      ? a
      : bodyText(node.whenTrue, src, rebind(node.whenTrue, condText, bind, src));
    return {
      kind: "narrow", subject: condText, pattern: "P.string.minLength(1)",
      bind: usesName(node.whenTrue, bind) ? bind : null, a: aBound, b,
    };
  }

  if (hasNullish && restIsTruthy && isRef) {
    const bind = ts.isIdentifier(cond) ? cond.text : cond.name.text;
    const aBound = ts.isIdentifier(cond)
      ? a
      : bodyText(node.whenTrue, src, rebind(node.whenTrue, condText, bind, src));
    const used = usesName(node.whenTrue, bind);
    if (isNullLit(node.whenFalse) || isUndefLit(node.whenFalse)) {
      return {
        kind: "option", source: condText, bind, body: aBound,
        out: isNullLit(node.whenFalse) ? "O.toNullable" : "O.toUndefined",
      };
    }
    return { kind: "nullish", subject: condText, bind: used ? bind : null, a: aBound, b };
  }

  return { kind: "match", subject: `Boolean(${condText})`, a, b };
}

/** `{ foo: foo }` reads as `{ foo }` once a branch binds the value to its own name. */
const shorthand = (out) => out.replace(/\b(\w+): \1(?=[,}\s])/g, "$1");

function render(p) {
  if (p.kind === "option") {
    return `pipe(O.fromNullable(${p.source}), O.map((${p.bind}) => ${p.body}), ${p.out})`;
  }
  const arg = p.bind ? `(${p.bind})` : "()";
  if (p.kind === "nullish") {
    return `match(${p.subject}).with(P.nullish, () => ${p.b}).otherwise(${arg} => ${p.a})`;
  }
  if (p.kind === "narrow") {
    return `match(${p.subject}).with(${p.pattern}, ${arg} => ${p.a}).otherwise(() => ${p.b})`;
  }
  return `match(${p.subject}).with(true, () => ${p.a}).otherwise(() => ${p.b})`;
}

const MODULES = { match: "ts-pattern", P: "ts-pattern", O: "@mobily/ts-belt", pipe: "@mobily/ts-belt" };

/** Adds the named imports the rewrite depends on, merging into an existing line. */
function ensureImports(text, names) {
  const wanted = new Map();
  for (const n of names) {
    const mod = MODULES[n];
    wanted.set(mod, [...(wanted.get(mod) ?? []), n]);
  }

  for (const [mod, needed] of wanted) {
    const re = new RegExp(`import \\{([^}]*)\\} from "${mod.replace("/", "\\/")}";`);
    const found = text.match(re);
    if (found) {
      const list = found[1].split(",").map((x) => x.trim()).filter(Boolean);
      for (const n of needed) if (!list.includes(n)) list.push(n);
      const values = list.filter((x) => !x.startsWith("type ")).sort();
      const types = list.filter((x) => x.startsWith("type "));
      text = text.replace(re, `import { ${[...values, ...types].join(", ")} } from "${mod}";`);
      continue;
    }
    const line = `import { ${[...new Set(needed)].sort().join(", ")} } from "${mod}";\n`;
    const lastImport = [...text.matchAll(/^import .*?;$/gms)].pop();
    text = lastImport
      ? text.slice(0, lastImport.index + lastImport[0].length + 1) + line +
        text.slice(lastImport.index + lastImport[0].length + 1)
      : line + text;
  }
  return text;
}

let total = 0;
const stats = { match: 0, nullish: 0, option: 0, narrow: 0 };

for (const configPath of PROJECTS) {
  const host = {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: (d) => {
      throw new Error(ts.flattenDiagnosticMessageText(d.messageText, "\n"));
    },
  };
  const parsed = ts.getParsedCommandLineOfConfigFile(configPath, {}, host);
  if (!parsed) throw new Error(`cannot read ${configPath}`);
  const program = ts.createProgram(parsed.fileNames, { ...parsed.options, noEmit: true });
  const checker = program.getTypeChecker();
  const root = path.resolve(path.dirname(configPath));

  for (const src of program.getSourceFiles()) {
    if (src.isDeclarationFile) continue;
    if (!src.fileName.startsWith(root) || src.fileName.includes("node_modules")) continue;

    // Outermost ternaries only: a nested one is rewritten on the next run,
    // when the program has been rebuilt and its types are accurate again.
    const hits = [];
    const walk = (node, inside) => {
      if (ts.isConditionalExpression(node)) {
        if (!inside) hits.push(node);
        ts.forEachChild(node, (k) => walk(k, true));
        return;
      }
      ts.forEachChild(node, (k) => walk(k, inside));
    };
    walk(src, false);
    if (hits.length === 0) continue;

    let text = src.getFullText();
    const names = new Set();
    for (const node of hits.reverse()) {
      const p = plan(node, checker, src);
      stats[p.kind]++;
      if (p.kind === "option") { names.add("pipe"); names.add("O"); }
      else if (p.kind === "match") names.add("match");
      else { names.add("match"); names.add("P"); }
      text = text.slice(0, node.getStart(src)) + shorthand(render(p)) + text.slice(node.getEnd());
      total++;
    }
    writeFileSync(src.fileName, ensureImports(text, names));
  }
}

console.log("rewritten:", total, JSON.stringify(stats));
