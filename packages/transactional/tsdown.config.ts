import { defineConfig } from "tsdown";

export default defineConfig({
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
  clean: true,
});
