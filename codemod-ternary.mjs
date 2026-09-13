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

/** True when the branch awaits in its own scope, so the arrow it moves into must be async. */
function hasAwait(node) {
  let found = false;
  const walk = (n) => {
    if (found) return;
    if (ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) ||
        ts.isArrowFunction(n) || ts.isMethodDeclaration(n)) return;
    if (ts.isAwaitExpression(n)) { found = true; return; }
    ts.forEachChild(n, walk);
  };
  walk(node);
  return found;
}

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

const EQ = new Set([ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken]);
const NEQ = new Set([ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken]);

const isLiteralOperand = (n) =>
  ts.isStringLiteral(n) || ts.isNumericLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n);
const isNullishOperand = (n) => n.kind === ts.SyntaxKind.NullKeyword || isUndefLit(n);

/**
 * Reads a condition back into a ts-pattern pattern. `on` says which branch the
 * pattern selects, so the other branch is the one that keeps the narrowed value.
 */
function narrowingOf(cond, src) {
  if (ts.isBinaryExpression(cond) && cond.operatorToken.kind === ts.SyntaxKind.InstanceOfKeyword) {
    return { subject: cond.left, pattern: `P.instanceOf(${cond.right.getText(src)})`, on: "true" };
  }
  if (!ts.isBinaryExpression(cond)) return null;
  const eq = EQ.has(cond.operatorToken.kind);
  const neq = NEQ.has(cond.operatorToken.kind);
  if (!eq && !neq) return null;

  const { left: l, right: r } = cond;
  const on = eq ? "true" : "false";

  const typeofSide = ts.isTypeOfExpression(l) ? l : ts.isTypeOfExpression(r) ? r : null;
  const strSide = ts.isStringLiteral(l) ? l : ts.isStringLiteral(r) ? r : null;
  if (typeofSide && strSide && TYPEOF_PATTERNS[strSide.text]) {
    return { subject: typeofSide.expression, pattern: TYPEOF_PATTERNS[strSide.text], on };
  }

  const litSide = isLiteralOperand(l) ? l : isLiteralOperand(r) ? r : null;
  const other = litSide === l ? r : l;
  if (litSide && !ts.isTypeOfExpression(other)) {
    return { subject: other, pattern: litSide.getText(src), on };
  }

  const nullSide = isNullishOperand(l) ? l : isNullishOperand(r) ? r : null;
  if (nullSide) {
    const subject = nullSide === l ? r : l;
    // A loose comparison catches both null and undefined; a strict one does not.
    const pattern = cond.operatorToken.kind === ts.SyntaxKind.EqualsEqualsToken ||
      cond.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsToken
      ? "P.nullish"
      : nullSide.kind === ts.SyntaxKind.NullKeyword ? "null" : "undefined";
    return { subject, pattern, on };
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

/** Contextual literal unions widen inside an arrow, so literal branches keep `as const`. */
function needsConst(node, checker) {
  const ctx = checker.getContextualType(node);
  if (!ctx) return false;
  const parts = ctx.isUnion() ? ctx.types : [ctx];
  return parts.some((t) => t.isLiteral() || t.flags & ts.TypeFlags.BooleanLiteral);
}

/** `isThing(x)` where isThing is a type predicate, so the branch can narrow x. */
function guardOf(cond, checker) {
  if (!ts.isCallExpression(cond) || cond.arguments.length !== 1) return null;
  const arg = cond.arguments[0];
  if (!ts.isIdentifier(arg) && !ts.isPropertyAccessExpression(arg)) return null;
  const sigType = checker.getTypeAtLocation(cond.expression);
  for (const sig of sigType.getCallSignatures()) {
    if (checker.getTypePredicateOfSignature(sig)) return { subject: arg, callee: cond.expression };
  }
  return null;
}

function plan(node, checker, src, flip = false) {
  const cond = node.condition;
  // `!x ? a : b` is `x ? b : a`, and the positive form is the one every tier reads.
  if (ts.isPrefixUnaryExpression(cond) && cond.operator === ts.SyntaxKind.ExclamationToken) {
    return plan(
      { ...node, condition: cond.operand, whenTrue: node.whenFalse, whenFalse: node.whenTrue,
        getStart: node.getStart.bind(node), getEnd: node.getEnd.bind(node) },
      checker, src, !flip,
    );
  }
  const condText = cond.getText(src);
  const keepConst = needsConst(node, checker);
  const lit = (n, t) => (keepConst && (isLiteralOperand(n) || n.kind === ts.SyntaxKind.TrueKeyword ||
    n.kind === ts.SyntaxKind.FalseKeyword) ? `${t} as const` : t);
  const a = lit(node.whenTrue, bodyText(node.whenTrue, src));
  const b = lit(node.whenFalse, bodyText(node.whenFalse, src));
  const isAsync = hasAwait(node.whenTrue) || hasAwait(node.whenFalse);

  // `typeof x === "number" ? ... : ...` loses its narrowing inside an arrow,
  // so it becomes a pattern on x instead of a boolean.
  const guard = guardOf(cond, checker);
  const narrow = guard
    ? { subject: guard.subject, pattern: `P.when(${guard.callee.getText(src)})`, on: "true" }
    : narrowingOf(cond, src);
  if (narrow) {
    const subjText = narrow.subject.getText(src);
    const bind = ts.isIdentifier(narrow.subject)
      ? narrow.subject.text
      : ts.isPropertyAccessExpression(narrow.subject) ? narrow.subject.name.text : null;
    if (bind) {
      // The pattern selects one branch; the other one is where the value is narrowed.
      const matched = narrow.on === "true" ? node.whenTrue : node.whenFalse;
      const rest = narrow.on === "true" ? node.whenFalse : node.whenTrue;
      const bound = (n) =>
        lit(n, ts.isIdentifier(narrow.subject)
          ? bodyText(n, src)
          : bodyText(n, src, rebind(n, subjText, bind, src)));
      return {
        kind: "narrow", subject: subjText, pattern: narrow.pattern,
        matched: bound(matched), rest: bound(rest),
        matchedBind: usesName(matched, bind) ? bind : null,
        restBind: usesName(rest, bind) ? bind : null,
        isAsync,
      };
    }
  }

  if (ts.isPropertyAccessExpression(cond) && cond.name.text === "length") {
    return { kind: "match", subject: `${condText} > 0`, a, b, isAsync };
  }
  if (looksBoolean(cond)) return { kind: "match", subject: condText, a, b, isAsync };

  const type = checker.getTypeAtLocation(cond);
  const parts = type.isUnion() ? type.types : [type];
  if (parts.every((p) => p.flags & (ts.TypeFlags.Boolean | ts.TypeFlags.BooleanLiteral))) {
    return { kind: "match", subject: condText, a, b, isAsync };
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
      matched: aBound, rest: b,
      matchedBind: usesName(node.whenTrue, bind) ? bind : null, restBind: null,
      isAsync,
    };
  }

  if (hasNullish && restIsTruthy && isRef) {
    const bind = ts.isIdentifier(cond) ? cond.text : cond.name.text;
    const aBound = ts.isIdentifier(cond)
      ? a
      : bodyText(node.whenTrue, src, rebind(node.whenTrue, condText, bind, src));
    const used = usesName(node.whenTrue, bind);
    if (isNullLit(node.whenFalse) || isUndefLit(node.whenFalse)) {
      const bodyType = checker.getTypeAtLocation(node.whenTrue);
      const bodyParts = bodyType.isUnion() ? bodyType.types : [bodyType];
      return {
        kind: "option", source: condText, bind: used ? bind : null, body: aBound,
        // O.map refuses a nullable result; O.mapNullable folds it back to None.
        map: bodyParts.some((t) => t.flags & NULLISH) ? "O.mapNullable" : "O.map",
        out: isNullLit(node.whenFalse) ? "O.toNullable" : "O.toUndefined", isAsync,
      };
    }
    return { kind: "nullish", subject: condText, bind: used ? bind : null, a: aBound, b, isAsync };
  }

  return { kind: "match", subject: `Boolean(${condText})`, a, b, isAsync };
}

/** `{ foo: foo }` reads as `{ foo }` once a branch binds the value to its own name. */
const shorthand = (out) => out.replace(/\b(\w+): \1(?=\s*[,}])/g, "$1");

function render(p) {
  // A branch that awaits keeps its await, so both arrows turn async and the
  // whole match is awaited in the place the ternary used to sit.
  const fn = p.isAsync ? "async " : "";
  const lead = p.isAsync ? "await " : "";
  const param = (bind) => (bind ? `${fn}(${bind})` : `${fn}()`);
  if (p.kind === "option") {
    return `${lead}pipe(O.fromNullable(${p.source}), ${p.map}(${param(p.bind)} => ${p.body}), ${p.out})`;
  }
  const none = `${fn}()`;
  if (p.kind === "nullish") {
    return `${lead}match(${p.subject}).with(P.nullish, ${none} => ${p.b}).otherwise(${param(p.bind)} => ${p.a})`;
  }
  if (p.kind === "narrow") {
    return `${lead}match(${p.subject}).with(${p.pattern}, ${param(p.matchedBind)} => ${p.matched}).otherwise(${param(p.restBind)} => ${p.rest})`;
  }
  return `${lead}match(${p.subject}).with(true, ${none} => ${p.a}).otherwise(${none} => ${p.b})`;
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
      const out = shorthand(render(p));
      if (p.kind === "option") { names.add("pipe"); names.add("O"); }
      else names.add("match");
      // Only a pattern helper needs the P import; a literal pattern does not.
      if (/\bP\./.test(out)) names.add("P");
      text = text.slice(0, node.getStart(src)) + out + text.slice(node.getEnd());
      total++;
    }
    writeFileSync(src.fileName, ensureImports(text, names));
  }
}

console.log("rewritten:", total, JSON.stringify(stats));
