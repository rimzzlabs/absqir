import { fileURLToPath } from "node:url";
import { shared } from "@absqir/config/vitest";
import react from "@vitejs/plugin-react";
import { defineConfig, mergeConfig } from "vitest/config";

export default mergeConfig(
  shared,
  defineConfig({
    plugins: [react()],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    test: {
      environment: "jsdom",
      globals: true,
      include: ["tests/**/*.test.tsx"],
    },
  }),
);
