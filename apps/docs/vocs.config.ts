import { defineConfig } from "vocs";

export default defineConfig({
  title: "absqir",
  description: "Open-source QR attendance. Project a rotating code, watch check-ins arrive.",
  rootDir: "docs",
  iconUrl: { light: "/mark-light.svg", dark: "/mark-dark.svg" },
  logoUrl: { light: "/mark-light.svg", dark: "/mark-dark.svg" },
  theme: {
    accentColor: { light: "#2563eb", dark: "#7ca9ff" },
  },
  sidebar: [
    {
      text: "Self-host",
      items: [
        { text: "Getting started", link: "/getting-started" },
        { text: "Configuration", link: "/configuration" },
        { text: "Accounts and organizations", link: "/accounts" },
        { text: "Events and check-in", link: "/sessions" },
        { text: "Reports and calendar", link: "/reports" },
        { text: "Notifications and reminders", link: "/notifications" },
        { text: "Upgrades", link: "/upgrades" },
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
    { text: "Docs", link: "/getting-started" },
    { text: "GitHub", link: "https://github.com/absqir/absqir" },
  ],
  socials: [{ icon: "github", link: "https://github.com/absqir/absqir" }],
});
