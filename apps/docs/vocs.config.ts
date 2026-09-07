import { defineConfig } from "vocs";

export default defineConfig({
  title: "absqir",
  description: "Open-source QR attendance. Project a rotating code, watch check-ins arrive.",
  rootDir: "docs",
  sidebar: [
    {
      text: "Self-host",
      items: [
        { text: "Getting started", link: "/getting-started" },
        { text: "Configuration", link: "/configuration" },
        { text: "Accounts and organizations", link: "/accounts" },
        { text: "Upgrades", link: "/upgrades" },
      ],
    },
    {
      text: "Reference",
      items: [
        { text: "CLI", link: "/cli" },
        { text: "Architecture", link: "/architecture" },
      ],
    },
  ],
  topNav: [
    { text: "Docs", link: "/getting-started" },
    { text: "GitHub", link: "https://github.com/absqir/absqir" },
  ],
  socials: [{ icon: "github", link: "https://github.com/absqir/absqir" }],
});
