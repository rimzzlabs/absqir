import { defineConfig } from "tsdown";

export default defineConfig((options) => ({
  entry: ["src/components/ui/*.tsx", "src/components/*.tsx", "src/hooks/*.ts", "src/lib/utils.ts"],
  outDir: "dist",
  format: "esm",
  platform: "neutral",
  dts: true,
  fixedExtension: false,
  unbundle: true,
  external: ["react", "react-dom", "react/jsx-runtime"],
  // `clean` wipes dist. In watch mode the package watchers run at the same
  // time, and a wiped dist makes a sibling's .d.ts generation fall back to
  // `any` for anything it imports from here. Clean on a one-shot build only.
  clean: !options.watch,
}));
