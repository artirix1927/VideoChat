"use client";

import { useAuth } from "@/AuthContext";
import { useCallContext } from "@/CallContext";
import { useEffect, useRef, useState } from "react";
import { api } from "@/api";

export const useCallNotifications = () => {
  const { user } = useAuth();
  const { setIncomingCall, setModalHandlers } = useCallContext();
  const wsConnections = useRef<Record<number, WebSocket>>({});
  const [hasSetup, setHasSetup] = useState(false);

  useEffect(() => {
    if (!user || hasSetup) return;

    // Fetch user's chats using your existing API utility
    const setupCallListeners = async () => {
      try {
        //console.log("Setting up call listeners for user:", user.id);
        
        // Use your existing API function instead of fetch
        const response = await api.getChats({ user_id: user.id });
        const chats = response.chats || [];
        
        //console.log("Found chats:", chats.length);
        
        chats.forEach((chat: any) => {
          setupChatWebSocket(chat.id);
        });
        
        setHasSetup(true);
      } catch (error) {
        //console.error("Failed to fetch chats:", error);
        // Set hasSetup to true even on error to prevent infinite retries
        setHasSetup(true);
      }
    };

    setupCallListeners();

    return () => {
      // Clean up all WebSocket connections
      Object.values(wsConnections.current).forEach(ws => {
        try { ws.close(); } catch {}
      });
      wsConnections.current = {};
      // DON'T reset hasSetup here - that causes the infinite loop
    };
  }, [user]); // Removed hasSetup from dependencies

  const setupChatWebSocket = (chatId: number) => {
    if (!user || wsConnections.current[chatId]) {
      //log("Skipping WebSocket setup for chat", chatId);
      return;
    }

    const myId = Number(user.id);
    //console.log("Setting up WebSocket for chat:", chatId, "user:", myId);
    
    try {
      const ws = new WebSocket(`ws://localhost:8000/ws/signaling/${chatId}/${myId}`);

      ws.addEventListener("open", () => {
        //console.log(`WebSocket connected for chat ${chatId}`);
        // Send a join message to register with the server
        ws.send(JSON.stringify({
          type: "join",
          userId: myId,
          chatId: chatId
        }));
      });

      ws.addEventListener("message", (event) => {
        try {
          const message = JSON.parse(event.data);
          //console.log("Received message:", message);
          
          if (message.type === "call-invite" && message.from !== myId) {
            console.log("Incoming call detected:", message);
            handleIncomingCall(message.callId, message.from);
          }
        } catch (error) {
          //console.error("Error parsing message:", error, "Raw data:", event.data);
        }
      });

      ws.addEventListener("error", (error) => {
        console.error("WebSocket error for chat", chatId, ":", error);
        // Remove from connections to allow reconnection
        delete wsConnections.current[chatId];
      });

      ws.addEventListener("close", (event) => {
        //console.log("WebSocket closed for chat", chatId, "code:", event.code);
        delete wsConnections.current[chatId];
      });

      wsConnections.current[chatId] = ws;
    } catch (error) {
      console.error("Failed to create WebSocket for chat", chatId, ":", error);
    }
  };

  const handleIncomingCall = (callId: string, fromUserId: number) => {
    console.log("Handling incoming call:", callId, "from:", fromUserId);
    
    // Set up modal handlers
    setModalHandlers({
      accept: () => acceptCall(callId, fromUserId),
      decline: () => declineCall(callId, fromUserId),
    });
    
    // Show the modal
    setIncomingCall({ from: fromUserId, callId });
  };

  const acceptCall = (callId: string, fromUserId: number) => {
    //console.log("Accepting call:", callId);
    
    // Notify the caller that we accepted
    const ws = wsConnections.current[Number(callId)];
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: "call-accept",
        callId,
        from: user?.id
      }));
    }
    
    // Open the call window with context in URL
    const callUrl = `/video/call/${callId}?accepted=true&from=${fromUserId}`;
    window.open(callUrl, "_blank", "noopener,noreferrer");
    
    // Close the modal
    setIncomingCall(null);
    setModalHandlers(null);
  };

  const declineCall = (callId: string, fromUserId: number) => {
    console.log("Declining call:", callId);
    
    // Notify the caller that we declined
    const ws = wsConnections.current[Number(callId)];
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: "call-decline",
        callId,
        from: user?.id
      }));
    }
    
    // Close the modal
    setIncomingCall(null);
    setModalHandlers(null);
  };

  return { setupChatWebSocket };
};