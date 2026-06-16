/**
 * Sticker system interfaces for the Abhijeet Chatbot.
 */

export interface Sticker {
  id: string;
  keywords: string[];
  imagePath: string; // relative to /public/stickers/
  alt: string;
}

export interface StickerConfig {
  stickers: Array<{
    id: string;
    keywords: string[];
    file: string;
    alt: string;
  }>;
}
