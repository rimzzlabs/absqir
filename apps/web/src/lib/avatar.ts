import { A } from "@mobily/ts-belt";
import { match } from "ts-pattern";
/** Matches MAX_AVATAR_BYTES in packages/api. */
export const MAX_AVATAR_BYTES = 48_000;
const SIZE = 128;
const QUALITIES = [0.85, 0.7, 0.55, 0.4];

/**
 * Squares and shrinks a picture to 128px in the browser, so the server only
 * ever stores a small data URL. Tries WebP first, then JPEG for old engines.
 */
export async function toAvatarDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot resize pictures.");

  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    SIZE,
    SIZE,
  );
  bitmap.close();

  for (const type of ["image/webp", "image/jpeg"]) {
    for (const quality of QUALITIES) {
      const url = canvas.toDataURL(type, quality);
      if (url.startsWith(`data:${type}`) && url.length <= MAX_AVATAR_BYTES) return url;
    }
  }

  throw new Error("That picture is too detailed to shrink. Try a simpler one.");
}

/** Two letters for the fallback circle. */
export function initialsOf(name: string): string {
  const parts = A.filter(name.trim().split(/\s+/), Boolean);
  const letters = match(parts.length >= 2)
    .with(true, () => [parts[0], parts.at(-1)])
    .otherwise(() => parts.slice(0, 1));

  return A.map(letters, (part) => part?.[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}
