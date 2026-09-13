/** The organizer's queue of leave requests. */
export const leave = {
  title: "Leave requests",
  description:
    "A member asks to be excused before an event. Approve, and the record shows excused instead of absent.",
  pending: "Pending",
  decided: "Decided",
  tableLabel: "Leave requests",
  person: "Person",
  event: "Event",
  reason: "Reason",
  note: "Note: {{note}}",
  asked: "Asked",
  status: "Status",
  approve: "Approve",
  decline: "Decline",
  emptyPendingTitle: "Nothing to decide",
  emptyPendingDescription: "A member who cannot make an event asks here. You approve or decline.",
  emptyDecidedTitle: "Nothing decided yet",
  emptyDecidedDescription: "Approved and declined requests land here.",
  dialog: {
    title: "{{decision}} {{name}}",
    approveDescription: "The record for this event shows excused instead of absent.",
    declineDescription: "The record stays as it is. The member sees your note.",
    note: "Note",
    noteHint: "Optional. The member sees it.",
  },
} as const;
