'use client';

import { ChatMessage } from '@/lib/types';
import StickerImage from '@/components/StickerImage';

interface ChatBubbleProps {
  message: ChatMessage;
}

export default function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-2 text-sm sm:text-base break-words ${
          isUser
            ? 'bg-blue-500 text-white rounded-br-sm'
            : 'bg-gray-200 text-gray-900 rounded-bl-sm'
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {message.stickerId && (
          <div className="mt-2">
            <StickerImage stickerId={message.stickerId} />
          </div>
        )}
      </div>
    </div>
  );
}
