/** Groups: who an event expects. */
export const groups = {
  title: "Groups",
  description: "Who is expected where. An event invites a whole group at once.",
  new: "New group",
  emptyTitle: "No groups yet",
  emptyDescription:
    "A group is a team, a division, a class, or a cohort. An event expects a group, and everyone in it who does not check in is marked absent.",
  dialog: {
    editTitle: "Edit group",
    newTitle: "New group",
    editDescription: "Rename it or change its description.",
    newDescription: "Give it a name. Add people after.",
    name: "Name",
    namePlaceholder: "Engineering, Batch 12, Volunteers",
    description: "Description",
    descriptionHint: "Optional.",
    create: "Create",
  },
  sheet: {
    fallbackTitle: "Group",
    noDescription: "No description.",
    saveMembers: "Save members",
    filter: "Filter the directory",
    noEmail: "no email",
    nobodyMatches: "Nobody matches.",
    deleteTitle: "Delete {{name}}?",
    deleteDescription: "The people stay in the directory. Only the group goes.",
    keep: "Keep",
    deleting: "Deleting…",
  },
} as const;
