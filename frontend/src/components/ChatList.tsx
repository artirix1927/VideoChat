

"use client";
import { useAuth } from "@/AuthContext";
import { useEffect, useState } from "react";
import { api } from "@/api";
import { Chat } from "@/types";



type Props = {
    onSelectChat: (chatId: number) => void;
    selectedChat: number | null;
  };

export const ChatsList = ({ onSelectChat, selectedChat }: Props) => {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);

  useEffect(() => {
    if (!user) return;
    api.getChats({ user_id: user.id }).then((res) => {
      setChats(res.chats);
    });
  }, [user]);


  const handleStartCall = (chatId: number) => {
    window.open(`/video/call/${chatId}`, "_blank", "noopener,noreferrer");
  };


  if (!user) return null;

  return (
    <div className="bg-neutral-900 p-4 rounded-xl h-full">
      <h2 className="text-xl mb-4">Chats</h2>
      {chats.length > 0 ? (
        chats.map((chat) => {
          const isSelected = chat.id === selectedChat;
          return (
            <div
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={`w-3/4 text-left my-2 p-3 rounded-xl bg-neutral-800 
                hover:bg-neutral-700 transition-all flex items-center`}
              style={
                isSelected
                  ? {
                      outline: "2px solid #525252",
                      outlineOffset: "2px",
                    }
                  : {}
              }
            >
              <span>
                {chat.members
                  .filter((p) => p.user.id !== user.id)
                  .map((p) => p.user.username)
                  .join(", ")}
              </span>

              <button
                onClick={(e) => {
                  e.stopPropagation(); // prevent triggering chat select
                  handleStartCall(chat.id);
                }}
                className="ml-auto bg-neutral-700 hover:bg-neutral-600 px-3 py-1 rounded-lg"
              >
                Call
              </button>
            </div>
          );
        })
      ) : (
        <div className="text-neutral-500 italic">No chats yet.</div>
      )}
    </div>
  );
};