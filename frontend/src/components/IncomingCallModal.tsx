// components/IncomingCallModal.tsx
"use client";

import { IncomingCall } from "@/CallContext";
import { useEffect } from "react";

interface Props {
  call: IncomingCall;
  onAccept: () => void;
  onDecline: () => void;
}

export const IncomingCallModal = ({ call, onAccept, onDecline }: Props) => {
  // Play notification sound or use browser notifications
  useEffect(() => {
    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    // Play sound (optional)
    const audio = new Audio('/media/facebook_call.mp3');
    audio.play().catch(() => {});

    return () => {
      audio.pause();
    };
  }, []);

  // Show browser notification if allowed
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Incoming Call", {
        body: `User ${call.from} is calling you`,
        icon: "/icon.png",
      });
    }
  }, [call]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-neutral-800 p-8 rounded-2xl max-w-md w-full mx-4 border-2 border-blue-500 animate-pulse">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M4.05 16.05A9 9 0 1 1 19.95 7.95" />
              <path strokeLinecap="round" d="M15 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Incoming Call</h2>
          <p className="text-neutral-300">
            User <span className="font-semibold text-blue-400">{call.from}</span> is calling you
          </p>
        </div>
        
        <div className="flex gap-4 justify-center">
          <button
            onClick={onDecline}
            className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-full text-white font-semibold flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Decline
          </button>
          <button
            onClick={onAccept}
            className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-full text-white font-semibold flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M14.828 14.828a4 4 0 0 1-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};