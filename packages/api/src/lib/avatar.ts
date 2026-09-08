import { z } from "@hono/zod-openapi";

/** A 128px avatar as WebP or JPEG lands well under this. */
export const MAX_AVATAR_BYTES = 48_000;
export const AVATAR_DATA_URL = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/;

/** The picture as a data URL, or null for none. Shared by onboarding and the account page. */
export const avatarSchema = z.string().max(MAX_AVATAR_BYTES).regex(AVATAR_DATA_URL).nullable();
