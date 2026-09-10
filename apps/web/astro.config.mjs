import { fileURLToPath } from "node:url";
import cloudflare from "@astrojs/cloudflare";
import node from "@astrojs/node";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, fontProviders } from "astro/config";

// One codebase, two targets. Cloudflare Workers is the default; the Docker
// image builds with DEPLOY_TARGET=node. The alias below swaps the platform
// glue (bindings, execution context) per target at build time.
const deployTarget = process.env.DEPLOY_TARGET === "node" ? "node" : "cloudflare";

// Every page depends on the reader's session, so the whole site renders per
// request. One server serves the assets, the pages, and the Hono API from a
// single origin.
export default defineConfig({
  output: "server",
  adapter: deployTarget === "node" ? node({ mode: "standalone" }) : cloudflare(),
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
    resolve: {
      alias: {
        "@app-runtime": fileURLToPath(
          new URL(`./src/lib/runtime/runtime-${deployTarget}.ts`, import.meta.url),
        ),
      },
    },
  },
});
