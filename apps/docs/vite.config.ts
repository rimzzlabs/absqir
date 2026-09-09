import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { vocs } from "vocs/vite";

export default defineConfig({
  plugins: [react(), vocs()],
  optimizeDeps: {
    // Vocs imports mermaid dynamically from inside its own package, so Vite's scanner
    // never sees it. Without this, the browser is the first thing to ask for mermaid,
    // and Vite serves its dayjs dependency unbundled — a UMD file with no default
    // export, which fails every diagram. Pre-bundling mermaid pulls dayjs in with it.
    include: ["mermaid"],
  },
});
