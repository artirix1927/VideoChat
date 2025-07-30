
// app/chat/page.tsx or app/ChatPage.tsx
"use client";

import { useState } from "react";
import { ChatComponent } from "@/components/Chat";
import { Navbar } from "@/components/Navbar";
import { ChatsList } from "@/components/ChatList";

export default function ChatPage() {
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);

  return (
    <div>
      <Navbar />
      <div className="flex gap-6 px-12 py-6 h-full">
        <div className="w-1/3 h-full">
          <ChatsList onSelectChat={setSelectedChatId} />
        </div>
        <div className="flex-1 h-full">
          {selectedChatId ? (
            <ChatComponent chatId={selectedChatId} />
          ) : (
            <div className="text-neutral-400 italic p-6">
              Select a chat to start messaging.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
