import { defineConfig } from "tsdown";

export default defineConfig((options) => ({
  entry: [
    "src/index.ts",
    "src/money.ts",
    "src/date.ts",
    "src/query-keys.ts",
    "src/user-agent.ts",
    "src/check-in-link.ts",
    "src/notification-channel.ts",
    "src/timezone.ts",
    "src/email-domain.ts",
    "src/attendance-series.ts",
  ],
  format: "esm",
  platform: "neutral",
  dts: true,
  fixedExtension: false,
  // `clean` wipes dist. In watch mode the package watchers run at the same
  // time, and a wiped dist makes a sibling's .d.ts generation fall back to
  // `any` for anything it imports from here. Clean on a one-shot build only.
  clean: !options.watch,
}));
