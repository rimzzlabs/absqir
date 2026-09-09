import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/schema.ts",
    "src/migrate.ts",
    "src/ops.ts",
    "src/people.ts",
    "src/domains.ts",
  ],
  format: "esm",
  platform: "node",
  dts: true,
  fixedExtension: false,
  clean: true,
});
