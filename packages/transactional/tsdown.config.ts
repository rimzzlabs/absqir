import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/emails/welcome.tsx"],
  format: "esm",
  platform: "node",
  dts: true,
  fixedExtension: false,
  clean: true,
});
