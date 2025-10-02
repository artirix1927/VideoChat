"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  Dispatch,
  SetStateAction,
} from "react";
import { IncomingCallModal } from "@/components/IncomingCallModal";

export type IncomingCall = {
  from: number; 
  callId: string;
};

type AppContextType = {
  incomingCall: IncomingCall | null;
  setIncomingCall: Dispatch<SetStateAction<IncomingCall | null>>;
  modalHandlers: { accept: () => void, decline: () => void } | null
  setModalHandlers: Dispatch<SetStateAction<{ accept: () => void, decline: () => void } | null>>
};

const CallContext = createContext<AppContextType | undefined>(undefined);

export const CallProvider = ({ children }: { children: ReactNode }) => {
    const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null)
    const [modalHandlers, setModalHandlers] = useState<{ accept: () => void, decline: () => void } | null>(null)
  
    return (
      <CallContext.Provider value={{ incomingCall, setIncomingCall, modalHandlers, setModalHandlers }}>
        {children}
        {incomingCall && modalHandlers && (
          <IncomingCallModal
            call={incomingCall}
            onAccept={modalHandlers.accept}
            onDecline={modalHandlers.decline}
          />
        )}
      </CallContext.Provider>
    )
  }

// Hook to use context
export const useCallContext = () => {
  const ctx = useContext(CallContext);
  if (!ctx) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return ctx;
};
