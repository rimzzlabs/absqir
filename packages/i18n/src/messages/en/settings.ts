/** Settings: your own account, and how the app behaves for you. */
export const settings = {
  title: "Settings",
  description: "Your account and how the app behaves for you.",
  nav: {
    label: "Settings sections",
    profile: "Profile",
    preferences: "Preferences",
    notifications: "Notifications",
    security: "Security",
  },
  language: {
    label: "Language",
    hint: "Your account holds this one, so every device you sign in on reads absqir the same way. Your notifications and your emails follow it. Other people keep their own choice.",
    selectLabel: "Choose a language",
    followingDevice: "Your browser asks for {{language}}.",
  },
  preferences: {
    title: "Preferences",
    description:
      "The theme and the animation stay in this browser, so a phone and a room screen can differ. The language follows your account.",
    theme: "Theme",
    themeHint: "System follows the device setting and changes with it.",
    themes: {
      system: "System",
      systemHint: "Follows the device",
      light: "Light",
      lightHint: "Always",
      dark: "Dark",
      darkHint: "Always",
    },
    animation: "Animation",
    animationHint:
      "Off stops every transition, popup and page motion. Follow the device respects the reduce motion setting of the operating system.",
    motions: {
      system: "Follow the device",
      on: "On",
      off: "Off",
    },
  },
} as const;
