/** The first run of a new account: name, picture, and where it belongs. */
export const onboarding = {
  steps: {
    label: "Onboarding steps",
    profile: "Profile",
    avatar: "Picture",
    organization: "Organization",
  },
  language: {
    label: "Language",
    hint: "We opened on the language your browser asks for. Change it here, or later in settings.",
  },
  profile: {
    title: "Tell us your name",
    description: "The name your organizers see.",
    descriptionWithPassword: "The name your organizers see, and a password for next time.",
    fullName: "Full name",
    password: "Password",
    passwordHint: "At least {{count}} characters. You can also sign in with an emailed code later.",
    addPassword: "Add a password",
    addPasswordHint:
      "{{provider}} already signs you in. A password is one more way back, for a device where that account is not set up.",
    continue: "Continue",
  },
  avatar: {
    title: "Add a picture",
    description: "Optional. It helps organizers spot you in a list. You can skip this.",
    choose: "Choose a picture",
    chooseAnother: "Choose another",
    formats: "PNG, JPEG, or WebP. Shrunk to 128px.",
    unreadable: "Could not read that picture.",
    saveAndContinue: "Save and continue",
  },
  organization: {
    finishing: "Finishing…",
    finishWithout: "Finish without joining",
  },
  event: {
    soldOut: "Every seat is taken.",
    closed: "This event no longer takes people.",
    register: "Register",
    registering: "Registering…",
  },
  done: "All set. One moment…",
  pageTitle: "Welcome",
} as const;
