

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
  const [pendingCalls, setPendingCalls] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!user) return;
    api.getChats({ user_id: user.id }).then((res) => {
      setChats(res.chats);
    });
  }, [user]);

  const sendCallInvite = async (chatId: number) => {
    if (!user) return;
    
    setPendingCalls(prev => ({ ...prev, [chatId]: true }));
    
    const myId = Number(user.id);
    const ws = new WebSocket(`ws://localhost:8000/ws/signaling/${chatId}/${myId}`);
    
    ws.addEventListener("open", () => {
      try {
        const msg = {
          type: "call-invite",
          callId: String(chatId),
          from: myId,
        };
        ws.send(JSON.stringify(msg));
        
        // Wait for response with timeout
        const responseHandler = (event: MessageEvent) => {
          try {
            const message = JSON.parse(event.data);
            
            if (message.type === "call-accept" && message.from !== myId) {
              // Call accepted - open call window
              window.open(`/video/call/${chatId}`, "_blank", "noopener,noreferrer");
              ws.removeEventListener("message", responseHandler);
              ws.close();
              setPendingCalls(prev => ({ ...prev, [chatId]: false }));
            } else if (message.type === "call-decline" && message.from !== myId) {
              // Call declined - show notification
              alert("Call was declined");
              ws.removeEventListener("message", responseHandler);
              ws.close();
              setPendingCalls(prev => ({ ...prev, [chatId]: false }));
            }
          } catch (error) {
            console.error("Error parsing response:", error);
          }
        };
        
        ws.addEventListener("message", responseHandler);
        
        // Timeout after 30 seconds
        setTimeout(() => {
          ws.removeEventListener("message", responseHandler);
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
          setPendingCalls(prev => ({ ...prev, [chatId]: false }));
          alert("No response from user");
        }, 30000);
        
      } catch (err) {
        console.error("Failed to send call-invite:", err);
        try { ws.close(); } catch {}
        setPendingCalls(prev => ({ ...prev, [chatId]: false }));
      }
    });
    
    ws.addEventListener("error", (error) => {
      console.error("Signaling WS error:", error);
      try { ws.close(); } catch {}
      setPendingCalls(prev => ({ ...prev, [chatId]: false }));
    });
  };

  const handleStartCall = (chatId: number) => {
    if (window.confirm("Start a video call?")) {
      sendCallInvite(chatId);
    }
  };

  if (!user) return null;

  return (
    <div className="bg-neutral-900 p-4 rounded-xl h-full">
      <h2 className="text-xl mb-4">Chats</h2>
      {chats.length > 0 ? (
        chats.map((chat) => {
          const isSelected = chat.id === selectedChat;
          const isPending = pendingCalls[chat.id];
          return (
            <div
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={`w-3/4 text-left my-2 p-3 rounded-xl bg-neutral-800 
                hover:bg-neutral-700 transition-all flex items-center
                ${isPending ? 'opacity-70' : ''}`}
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
                  ?.filter((p: any) => p.user.id !== user.id)
                  ?.map((p: any) => p.user.username)
                  ?.join(", ") || `Chat ${chat.id}`}
              </span>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartCall(chat.id);
                }}
                disabled={isPending}
                className="ml-auto bg-neutral-700 hover:bg-neutral-600 px-3 py-1 rounded-lg disabled:opacity-50"
              >
                {isPending ? 'Calling...' : 'Call'}
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