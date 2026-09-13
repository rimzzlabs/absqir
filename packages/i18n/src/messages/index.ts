import { en } from "#src/messages/en/index";
import { id } from "#src/messages/id/index";

/**
 * Every message in every language absqir speaks. English carries the types:
 * a key that Indonesian does not have yet falls back to the English words,
 * and a key that Indonesian invents on its own fails the type check.
 */
export const messages = { en, id } as const;

export type Messages = typeof en;
