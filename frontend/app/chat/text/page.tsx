
// app/chat/page.tsx or app/ChatPage.tsx
"use client";

import { useState } from "react";
import { ChatComponent } from "@/components/Chat";
import { ChatsList } from "@/components/ChatList";
import { FriendsList } from "@/components/FriendsList";
import { Navbar } from "@/components/Navbar";

export type ActivePanel = "chats" | "friends" | "requests";

export default function ChatPage() {
  const [activePanel, setActivePanel] = useState<ActivePanel>("chats");
  const [activeChatId, setActiveChatId] = useState<number | null>(null);

  return <>
    <div className="flex flex-col min-h-screen">
  <Navbar />

  <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <div className="w-1/3 bg-neutral-900 p-4 flex flex-col gap-4 overflow-hidden">
        {/* Tab Buttons */}
        <div className="flex gap-2 shrink-0">
          {["chats", "friends", "requests"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActivePanel(tab as ActivePanel)}
              className={`px-4 py-2 rounded-lg ${
                activePanel === tab
                  ? "bg-neutral-700"
                  : "bg-neutral-800 hover:bg-neutral-700"
              }`}
            >
              {tab === "chats"
                ? "Chats"
                : tab === "friends"
                ? "Friends"
                : "Friend Requests"}
            </button>
          ))}
        </div>

        {/* Panel */}
        <div className="flex-1 overflow-y-auto">
          {activePanel === "chats" ? (
            <ChatsList onSelectChat={(id) => setActiveChatId(id)} selectedChat={activeChatId} />
          ) : (
            <FriendsList activeTab={activePanel} setSelectedChat={setActiveChatId} setActivePanel={setActivePanel}/>
          )}
        </div>
      </div>

      {/* Chat */}
      
      <div className="w-2/3 bg-neutral-800 p-4 overflow-hidden">
        {activeChatId ? (
          <ChatComponent chatId={activeChatId} />
        ) : (
          <div className="text-neutral-400 text-center mt-20 text-lg italic">
            Select a chat to start messaging
          </div>
        )}
      </div>
    </div>
  </div>
    </>}

