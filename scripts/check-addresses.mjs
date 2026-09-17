/**
 * Every organization page lives under `/<slug>`, so an address written by
 * hand lands on a page that does not exist. Biome cannot see this: its
 * GritQL cannot match a JSX attribute, and it does not read .astro at all.
 * So the rule is checked here, over the source text.
 *
 * Build an organization address with `useOrgHref()` inside an island, or
 * with `orgPath()` outside one.
 *
 * What it reads is the text, so it catches an address written where it is
 * used. An address that reaches a link through a variable passes. Two of
 * those exist on purpose: the sidebar list in nav.ts, and the map of old
 * tabs in settings.astro. Both put the slug in front where they resolve.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "apps/web/src";
const EXTENSIONS = [".ts", ".tsx", ".astro"];

/** The first segment of every page an organization owns. */
const OWNED =
  "events|calendar|schedules|organization|groups|leave|check-in|check-in-problems|reports|my|notifications";

/** An address in a link, a redirect, or a column definition. */
const WRITTEN = new RegExp(
  String.raw`(?:href|action)\s*[=:]\s*\{?\s*["'\`](/(?:${OWNED})(?:[/?][^"'\`]*)?)["'\`]` +
    String.raw`|(?:location\.(?:assign|replace)\(|location\.href\s*=\s*|Astro\.redirect\()\s*["'\`](/(?:${OWNED})(?:[/?][^"'\`]*)?)["'\`]`,
  "g",
);

/** The one file that owns the unprefixed list, and resolves it itself. */
const ALLOWED = new Set([join(ROOT, "components/app-shell/nav.ts")]);

function* sourceFiles(directory) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);

    if (statSync(path).isDirectory()) {
      yield* sourceFiles(path);
      continue;
    }

    if (EXTENSIONS.some((extension) => entry.endsWith(extension))) yield path;
  }
}

const found = [];

for (const path of sourceFiles(ROOT)) {
  if (ALLOWED.has(path)) continue;

  const lines = readFileSync(path, "utf8").split("\n");

  lines.forEach((line, index) => {
    for (const match of line.matchAll(WRITTEN)) {
      found.push({ path, line: index + 1, address: match[1] ?? match[2] });
    }
  });
}

if (found.length > 0) {
  console.error("An organization address is written without its slug:\n");

  for (const row of found) {
    console.error(`  ${row.path}:${row.line}  ${row.address}`);
  }

  console.error(
    "\nBuild it with useOrgHref() inside an island, or orgPath() outside one.\nSee packages/core/src/org-path.ts.",
  );
  process.exit(1);
}

console.log("Addresses: no organization page is linked by a written address without its slug.");
