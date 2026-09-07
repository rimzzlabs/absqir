import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/components/ui/*.tsx", "src/components/*.tsx", "src/hooks/*.ts", "src/lib/utils.ts"],
  outDir: "dist",
  format: "esm",
  platform: "neutral",
  dts: true,
  fixedExtension: false,
  unbundle: true,
  external: ["react", "react-dom", "react/jsx-runtime"],
  clean: true,
});
