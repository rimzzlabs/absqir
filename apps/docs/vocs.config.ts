import { defineConfig } from "vocs";

export default defineConfig({
  title: "absqir",
  description: "Open-source QR attendance. Project a rotating code, watch check-ins arrive.",
  rootDir: "docs",
  iconUrl: "/favicon.svg",
  logoUrl: { light: "/logo-light.svg", dark: "/logo-dark.svg" },
  aiCta: true,
  editLink: {
    pattern: "https://github.com/rimzzlabs/absqir/edit/main/apps/docs/docs/pages/:path",
    text: "Suggest a change",
  },
  theme: {
    accentColor: { light: "#2563eb", dark: "#7ca9ff" },
  },
  sidebar: [
    {
      text: "Start here",
      items: [
        { text: "What absqir is", link: "/what-is-absqir" },
        { text: "Install absqir", link: "/getting-started" },
        { text: "Run your first event", link: "/first-event" },
      ],
    },
    {
      text: "Using absqir",
      items: [
        { text: "Accounts and organizations", link: "/accounts" },
        { text: "Events and check-in", link: "/sessions" },
        { text: "Reports and calendar", link: "/reports" },
        { text: "Notifications and reminders", link: "/notifications" },
      ],
    },
    {
      text: "Running your instance",
      items: [
        { text: "Configuration", link: "/configuration" },
        { text: "Going to production", link: "/production" },
        { text: "Upgrades", link: "/upgrades" },
        { text: "Troubleshooting", link: "/troubleshooting" },
      ],
    },
    {
      text: "Reference",
      items: [
        { text: "CLI", link: "/cli" },
        { text: "Architecture", link: "/architecture" },
        { text: "Brand", link: "/brand" },
      ],
    },
  ],
  topNav: [
    { text: "Docs", link: "/what-is-absqir", match: "/" },
    { text: "GitHub", link: "https://github.com/rimzzlabs/absqir" },
  ],
  socials: [{ icon: "github", link: "https://github.com/rimzzlabs/absqir" }],
});
