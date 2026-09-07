import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, fontProviders } from "astro/config";

// Every page depends on the reader's session, so the whole site renders per
// request. One Worker serves the assets, the pages, and the Hono API from a
// single origin.
export default defineConfig({
  output: "server",
  adapter: cloudflare(),
  integrations: [
    react({
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
  vite: { plugins: [tailwindcss()] },
});
