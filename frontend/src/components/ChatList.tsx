

"use client";
import { useAuth } from "@/AuthContext";
import { useEffect, useState } from "react";
import { api } from "@/api";
import { Chat } from "@/types";




type Props = {
    onSelectChat: (chatId: number) => void;
  };

export const ChatsList = ({ onSelectChat }: Props) => {
    const { user } = useAuth();
    const [chats, setChats] = useState<Chat[]>([]);

    useEffect(() => {
        if (!user) return;
        api.getChats({ user_id: user.id }).then((res) => {
        setChats(res.chats);
        });
    }, [user]);

    console.log(chats)
    if (!user) return null;

    return (
        <div className="bg-neutral-900 p-4 rounded-xl h-full">
        <h2 className="text-xl mb-4">Chats</h2>
        {chats.length > 0 ? (
            chats.map((chat) => (
            <button
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className="w-3/4 text-left bg-neutral-800 focus:outline-neutral-700 active:bg-neutral-900 focus:outline-2 focus:outline-offset-2 my-2 p-3 rounded-xl"
            >
                {chat.members
                .filter((p) => p.user.id !== user.id)
                .map((p) => p.user.username)
                .join(", ")}
            </button>
            ))
        ) : (
            <div className="text-neutral-500 italic">No chats yet.</div>
        )}
        </div>
    );
};