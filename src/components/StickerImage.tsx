'use client';

import { useState } from 'react';
import { getById } from '@/lib/sticker-registry';

interface StickerImageProps {
  stickerId: string;
}

export default function StickerImage({ stickerId }: StickerImageProps) {
  const [hasError, setHasError] = useState(false);

  const sticker = getById(stickerId);

  // If sticker ID is invalid, render nothing
  if (!sticker) {
    return null;
  }

  // If image failed to load, render nothing
  if (hasError) {
    return null;
  }

  return (
    <img
      src={`/stickers/${sticker.imagePath}`}
      alt={sticker.alt}
      className="max-w-[200px] max-h-[200px] object-contain rounded-lg"
      onError={() => setHasError(true)}
    />
  );
}
