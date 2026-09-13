/** The page behind an invitation link. */
export const invite = {
  accept: {
    signedOutTitle: "You have an invitation",
    signedOutDescription:
      "Sign in, or create your account. The invitation opens again once you are through.",
    continue: "Continue",
    brokenTitle: "This invitation cannot be opened",
    brokenDescription: "It expired, it was cancelled, or it was sent to another email address.",
    signedInAs: "You are signed in as {{email}}.",
    dashboard: "Go to the dashboard",
    title: "Join {{organization}}",
    description: "{{inviter}} invited you as {{role}}.",
    accept: "Accept the invitation",
    joining: "Joining…",
  },
} as const;
