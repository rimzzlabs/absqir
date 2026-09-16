import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import cloudflare from "@astrojs/cloudflare";
import node from "@astrojs/node";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, fontProviders } from "astro/config";
import { match } from "ts-pattern";

// One codebase, two targets. Cloudflare Workers is the default; the Docker
// image builds with DEPLOY_TARGET=node. The alias below swaps the platform
// glue (bindings, execution context) per target at build time.
const deployTarget = match(process.env.DEPLOY_TARGET)
  .with("node", () => "node")
  .otherwise(() => "cloudflare");

// `pnpm dev:https` signs a certificate first, so a phone on the LAN reaches a
// secure context. Without one the browser hides the camera API and the scanner
// cannot open. Plain `pnpm dev` stays http.
const certDir = fileURLToPath(new URL("./.certs/", import.meta.url));
const devHttps = match(process.env.DEV_HTTPS === "1" && existsSync(`${certDir}cert.pem`))
  .with(true, () => ({
    cert: readFileSync(`${certDir}cert.pem`),
    key: readFileSync(`${certDir}key.pem`),
  }))
  .otherwise(() => undefined);

// The workspace packages the worker runs. `db` stays out: `src/migrate.ts`
// imports the node-postgres migrator, which the worker never loads.
const SCANNED_PACKAGES = ["api", "auth", "core", "i18n", "ui"];

// Absolute globs, because the packages sit outside this app's Vite root.
const scanEntries = [
  fileURLToPath(new URL("./src/**/*.{ts,tsx,astro}", import.meta.url)),
  ...SCANNED_PACKAGES.map((name) =>
    fileURLToPath(new URL(`../../packages/${name}/src/**/*.{ts,tsx}`, import.meta.url)),
  ),
];

// Every page depends on the reader's session, so the whole site renders per
// request. One server serves the assets, the pages, and the Hono API from a
// single origin.
export default defineConfig({
  output: "server",
  adapter: match(deployTarget)
    .with("node", () => node({ mode: "standalone" }))
    .otherwise(() => cloudflare()),
  integrations: [
    react({
      // Keep Babel and the React Compiler away from Vite's pre-bundled deps.
      // Without this filter, Babel re-parses 500KB+ files in .vite/deps on
      // every request that touches them. The workspace packages resolve to
      // real paths outside node_modules, so they still get the compiler.
      exclude: ["**/node_modules/**"],
      babel: {
        plugins: [["babel-plugin-react-compiler", { target: "19" }]],
      },
    }),
  ],
  // Fonts are downloaded at build time and served from our own origin, so no
  // request ever leaves for a font CDN.
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: "Inter",
      cssVariable: "--font-inter",
      weights: ["100 900"],
      styles: ["normal"],
      subsets: ["latin"],
    },
    {
      provider: fontProviders.fontsource(),
      name: "JetBrains Mono",
      cssVariable: "--font-jetbrains-mono",
      weights: ["100 800"],
      styles: ["normal"],
      subsets: ["latin"],
    },
    {
      provider: fontProviders.fontsource(),
      name: "Merriweather",
      cssVariable: "--font-merriweather",
      weights: ["300 900"],
      styles: ["normal"],
      subsets: ["latin"],
    },
  ],
  server: { port: 4321 },
  vite: {
    plugins: [tailwindcss()],
    server: { https: devHttps },
    // The dev server pre-bundles the dependencies of each Vite environment.
    // Astro does not scan the sources for the server environments. A first
    // import then shows a new dependency, and the optimizer re-runs. The
    // re-run rewrites the cache while the worker still reads it, so the
    // request fails with "The file does not exist ... in the optimize deps
    // directory". The workerd runner keeps the broken module until a restart.
    // These entries scan the app and the UI package at startup, so every
    // dependency is in the cache before the first request. An edit outside
    // apps/web no longer starts a re-run.
    environments: {
      ssr: { optimizeDeps: { entries: scanEntries } },
      astro: { optimizeDeps: { entries: scanEntries } },
    },
    resolve: {
      alias: {
        "@app-runtime": fileURLToPath(
          new URL(`./src/lib/runtime/runtime-${deployTarget}.ts`, import.meta.url),
        ),
      },
    },
  },
});
