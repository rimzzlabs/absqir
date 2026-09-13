/** The page behind an open event's public link. */
export const publicEvent = {
  registered: "{{count, number}} registered",
  seats: "{{registered, number}} of {{limit, number}} seats taken",
  full: " · full",
  youAreRegistered: "You are registered",
  youAreRegisteredHint:
    "When the event runs, scan the screen in the room, or show your pass at the door.",
  myEvents: "My events",
  withdrawing: "Withdrawing…",
  withdraw: "Withdraw my registration",
  over: "This event is over.",
  closed: "Registration is closed.",
  soldOut: "Every seat is taken.",
  signIn: "Sign in to register",
  signInHint: "No account yet? The same door creates one with a code sent to your email.",
  registering: "Registering…",
  register: "Register",
  joinNote: "You join {{organization}} as a member, and this event expects you.",
  brokenTitle: "Nothing to register for",
  brokenDescription:
    "This link does not point to an open event. Ask the organizer for a fresh one.",
} as const;
