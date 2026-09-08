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

// The Base UI parts the design system reaches for. Listed once, bundled once.
const BASE_UI_PARTS = [
  "accordion",
  "alert-dialog",
  "avatar",
  "button",
  "checkbox",
  "collapsible",
  "dialog",
  "input",
  "menu",
  "merge-props",
  "popover",
  "radio",
  "radio-group",
  "scroll-area",
  "select",
  "separator",
  "switch",
  "tabs",
  "toast",
  "toggle",
  "toggle-group",
  "tooltip",
  "use-render",
];

const UI_DEPS = [
  ...BASE_UI_PARTS.map((part) => `@absqir/ui > @base-ui/react/${part}`),
  "@absqir/ui > @base-ui/react",
  "@absqir/ui > @base-ui/react/types",
  "@absqir/ui > class-variance-authority",
  "@absqir/ui > cn",
  "@absqir/ui > cmdk",
  "@absqir/ui > react-day-picker",
  "@absqir/ui > date-fns",
  "@absqir/ui > input-otp",
  "@absqir/ui > motion/react",
];

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
      // every request that touches them.
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
    // The workspace packages stay excluded so tsdown rebuilds show up without
    // a re-optimize. Their third-party imports are listed in `include` (the
    // "a > b" form resolves b through a's node_modules), so Vite bundles them
    // in one pass at startup instead of discovering them one page load at a
    // time, where each discovery forces a full reload.
    optimizeDeps: {
      exclude: ["@absqir/api", "@absqir/core", "@absqir/db", "@absqir/ui"],
      include: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@phosphor-icons/react",
        "react-hook-form",
        "@hookform/resolvers/zod",
        "zod",
        "ts-pattern",
        "input-otp",
        "qrcode",
        "jsqr",
        ...UI_DEPS,
        "@absqir/core > date-fns",
      ],
    },
    ssr: {
      optimizeDeps: {
        include: [
          "react",
          "react-dom",
          "react-dom/server",
          "react/jsx-runtime",
          "@tanstack/react-query",
          "@phosphor-icons/react",
          "react-hook-form",
          "@hookform/resolvers/zod",
          "zod",
          "ts-pattern",
          "astro/logger/console",
          // The middleware reads the session's memberships with drizzle itself.
          "drizzle-orm",
          "drizzle-orm/pg-core",
          "hono/body-limit",
          "hono/csrf",
          "hono/http-exception",
          "hono/request-id",
          "hono/secure-headers",
          "better-auth",
          "better-auth/api",
          "better-auth/plugins",
          "better-auth/adapters/drizzle",
          "@absqir/api > @hono/zod-openapi",
          "@absqir/api > @scalar/hono-api-reference",
          "@absqir/api > @t3-oss/env-core",
          "@absqir/api > drizzle-orm",
          "@absqir/api > hono/streaming",
          "@absqir/db > drizzle-orm",
          "@absqir/db > drizzle-orm/node-postgres",
          "@absqir/db > drizzle-orm/pg-core",
          "@absqir/db > pg",
          "@absqir/api > @absqir/transactional > @react-email/components",
          "@absqir/api > @absqir/transactional > resend",
          "input-otp",
          "qrcode",
          "jsqr",
          ...UI_DEPS,
          "@absqir/ui > react-day-picker > @date-fns/tz",
          "@absqir/core > date-fns",
        ],
      },
    },
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
