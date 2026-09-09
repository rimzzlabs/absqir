import { defineConfig } from "vocs/config";

const repo = "https://github.com/rimzzlabs/absqir";

export default defineConfig({
  title: "absqir",
  description: "Open-source QR attendance. Project a rotating code, watch check-ins arrive.",
  iconUrl: "/favicon.svg",
  logoUrl: { light: "/logo-light.svg", dark: "/logo-dark.svg" },
  accentColor: "light-dark(#2563eb, #7ca9ff)",
  colorScheme: "light dark",
  // The docs ship as files behind a static host, so nothing serves them at request time.
  renderStrategy: "full-static",
  editLink: {
    link: `${repo}/edit/main/apps/docs/src/pages/:path`,
    text: "Suggest a change",
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
    // absqir has not cut a 1.0. The mark says so, and every item under it is a
    // way to tell us what broke, so the warning and the report sit together.
    {
      text: "Beta",
      items: [
        { text: "Report a bug", link: `${repo}/issues/new?labels=bug` },
        { text: "Request a feature", link: `${repo}/issues/new?labels=enhancement` },
        { text: "Open issues", link: `${repo}/issues` },
      ],
    },
    { text: "GitHub", link: repo },
  ],
  socials: [{ icon: "github", link: repo }],
});
