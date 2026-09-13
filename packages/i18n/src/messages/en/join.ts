/** Every way into an organization: an invitation, a domain, or a new one. */
export const join = {
  waiting: {
    title: "Your request is with them",
    description: "{{name}} decides who comes in. You will hear back in absqir and by email.",
    sent: "Sent {{when}}",
    withdraw: "Withdraw",
    withdrawing: "Withdrawing…",
  },
  event: {
    title: "Join an organization",
    description: "Register for the event, and you join its organization as a member.",
  },
  invited: {
    title: "You have been invited",
    description: "Accept to get started.",
    joinAs: "Join as {{role}}",
    accept: "Accept",
    joining: "Joining…",
  },
  workspace: {
    title: "{{name}} is on absqir",
    autoDescription: "Everybody at {{domain}} can come straight in.",
    requestDescription: "They take people from {{domain}}. Ask, and an organizer decides.",
    join: "Join",
    ask: "Ask to join",
    send: "Send request",
    sending: "Sending…",
    notePlaceholder: "Tell {{name}} who you are. This is optional.",
    noteLabel: "A note for the organizers",
  },
  none: {
    title: "You are not in an organization yet",
    canCreate: "Start one below, or wait for an invitation.",
    cannotCreate: "An organizer has to invite you.",
  },
  create: "Create organization",
  createSeparate: "Start a separate organization",
  invitationHint:
    "An invitation to {{email}} brings you straight in. Open its link and you are there.",
} as const;
