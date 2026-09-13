/** Settings: the sections, the rows, and what each choice does. */
export const settings = {
  language: {
    label: "Language",
    hint: "Every screen, every notification and every email for your account reads in this language. Other people keep their own choice.",
    selectLabel: "Choose a language",
    followingDevice: "Your browser asks for {{language}}.",
    saved: "Saved. The page reloads to read in {{language}}.",
    saveFailed: "Could not save the language.",
  },
} as const;
