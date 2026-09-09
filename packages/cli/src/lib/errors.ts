/** The operator gave input the command cannot use. The exit code is 1. */
export class UsageError extends Error {}

/** Ctrl+C, or Esc on a prompt. The exit code is 130, and nothing is written. */
export class CancelError extends Error {}
