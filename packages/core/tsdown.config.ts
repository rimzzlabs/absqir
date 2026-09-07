import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/money.ts", "src/date.ts", "src/query-keys.ts"],
  format: "esm",
  platform: "neutral",
  dts: true,
  fixedExtension: false,
  clean: true,
});
