import { shared } from "@absqir/config/vitest";
import { defineConfig, mergeConfig } from "vitest/config";

export default mergeConfig(
  shared,
  defineConfig({
    test: {
      environment: "node",
      include: ["tests/**/*.test.ts"],
    },
  }),
);
