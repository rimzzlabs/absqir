import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/schema.ts"],
  format: "esm",
  platform: "node",
  dts: true,
  fixedExtension: false,
  clean: true,
});
