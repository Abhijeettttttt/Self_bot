import type { Sticker, StickerConfig } from "./sticker-types";
import stickerData from "../../public/stickers/stickers.json";

const config = stickerData as StickerConfig;

const stickers: Sticker[] = config.stickers.map((entry) => ({
  id: entry.id,
  keywords: entry.keywords,
  imagePath: entry.file,
  alt: entry.alt,
}));

const stickerMap = new Map<string, Sticker>(
  stickers.map((s) => [s.id, s])
);

/**
 * Look up a sticker by its ID.
 * Returns null for invalid or missing IDs.
 */
export function getById(id: string): Sticker | null {
  return stickerMap.get(id) ?? null;
}

/**
 * Returns a formatted string of sticker IDs and their keywords
 * for inclusion in the system prompt.
 */
export function getKeywordList(): string {
  return stickers
    .map((s) => `${s.id}: ${s.keywords.join(", ")}`)
    .join("\n");
}
