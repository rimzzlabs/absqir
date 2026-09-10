import { defineConfig } from "tsdown";

export default defineConfig((options) => ({
  entry: [
    "src/index.ts",
    "src/emails/otp.tsx",
    "src/emails/invitation.tsx",
    "src/emails/notification.tsx",
  ],
  format: "esm",
  platform: "node",
  dts: true,
  fixedExtension: false,
  // `clean` wipes dist. In watch mode the package watchers run at the same
  // time, and a wiped dist makes a sibling's .d.ts generation fall back to
  // `any` for anything it imports from here. Clean on a one-shot build only.
  clean: !options.watch,
}));
