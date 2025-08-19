"use client";
import { useAuth } from "@/AuthContext";
import { useEffect, useRef, useState } from "react";
import { api } from "@/api";
import { Chat, Message } from "@/types";

// Define WebSocket ready state constants for type safety
const WebSocketState = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
} as const;

type ChatProps = {
  chatId: number;
};

export const ChatComponent = ({ chatId }: ChatProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const retryCount = useRef(0);
  const maxRetries = 5;
  const connectionLock = useRef(false);

  // WebSocket connection management
  useEffect(() => {
    if (!user) return;
  
    // Prevent multiple connections
    if (ws.current && ws.current.readyState !== WebSocketState.CLOSED) {
      return;
    }
  
    let isMounted = true; // Track if component is still mounted
    let reconnectTimeoutId: NodeJS.Timeout | null = null;
  
    const connectWebSocket = () => {
      // Clean up any existing connection first
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
  
      if (!isMounted) return;
  
      setConnectionError(null);
      const socketUrl = `ws://localhost:8003/ws/chat/${chatId}?user_id=${user.id}`;
      const socket = new WebSocket(socketUrl);
  
      socket.onopen = () => {
        if (!isMounted) {
          socket.close();
          return;
        }
        console.log("WebSocket connected");
        ws.current = socket;
        setIsConnected(true);
        retryCount.current = 0;
        connectionLock.current = false;
      };
  
      socket.onmessage = (event) => {
        if (!isMounted) return;
        const msg = JSON.parse(event.data);
        setMessages((prev) => [...prev, msg]);
      };
  
      socket.onclose = (event) => {
        if (!isMounted) return;
        
        setIsConnected(false);
        ws.current = null;
        
        if (!event.wasClean && retryCount.current < maxRetries && isMounted) {
          const retryDelay = Math.min(1000 * Math.pow(2, retryCount.current), 10000);
          console.log(`WebSocket closed, retrying in ${retryDelay}ms...`);
          
          reconnectTimeoutId = setTimeout(() => {
            if (isMounted) {
              connectWebSocket();
            }
          }, retryDelay);
          
          retryCount.current += 1;
        } else if (retryCount.current >= maxRetries) {
          setConnectionError("Failed to connect after multiple attempts. Please refresh the page.");
          connectionLock.current = false;
        }
      };
  
      socket.onerror = (error) => {
        if (!isMounted) return;
        console.error("WebSocket error:", error);
        setConnectionError("Connection error. Trying to reconnect...");
      };
    };
  
    // Only connect if we don't already have a connection
    if (!connectionLock.current) {
      connectionLock.current = true;
      connectWebSocket();
    }
  
    // Fetch initial messages
    const fetchMessages = async () => {
      if (!isMounted) return;
      try {
        const data = await api.getChatMessages({ chat_id: chatId });
        if (isMounted) {
          setMessages(data.messages);
        }
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      }
    };
  
    fetchMessages();
  
    // Cleanup function
    return () => {
      isMounted = false;
      connectionLock.current = false;
      
      // Clear any pending reconnection attempts
      if (reconnectTimeoutId) {
        clearTimeout(reconnectTimeoutId);
      }
      
      if (ws.current) {
        if (ws.current.readyState === WebSocketState.OPEN) {
          ws.current.close(1000, "Component unmounting");
        }
        ws.current = null;
      }
    };
  }, [chatId, user?.id]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;

    if (ws.current?.readyState === WebSocketState.OPEN) {
      try {
        ws.current.send(JSON.stringify({ content: input }));
        setInput("");
      } catch (error) {
        console.error("Error sending message:", error);
        setConnectionError("Failed to send message. Trying to reconnect...");
      }
    } else {
      setConnectionError("Connection not ready. Please wait...");
    }
  };

  if (!user) return null;

  console.log(messages)

  return (
    <div className="flex flex-col h-full p-4 gap-2">

      <div className="flex-1 overflow-y-auto space-y-2 text-sm">
        {messages.map((msg, index) => (
          <div
            key={msg.id ?? `${index}-${msg.timestamp}`}
            className={`p-2 rounded-lg max-w-xs ${
              msg.sender_id === user.id ? "bg-blue-700 ml-auto" : "bg-neutral-700"
            }`}
          >
            <div>{msg.content}</div>
            <div className="text-xs text-neutral-400 text-right">
              {new Date(msg.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 px-4 py-2 rounded-lg bg-neutral-700 text-white"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder={isConnected ? "Type a message..." : "Connecting..."}
          disabled={!isConnected}
        />
        <button
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-700"
          onClick={sendMessage}
          disabled={!isConnected || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
};

