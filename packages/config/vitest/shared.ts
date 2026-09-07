import { defineConfig } from "vitest/config";

export const shared = defineConfig({
  test: {
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      exclude: ["**/dist/**", "**/*.config.ts", "**/*.d.ts"],
    },
  },
});
