// app/providers.tsx
"use client";

import { AuthProvider } from "@/AuthContext";
import { CallProvider } from "@/CallContext";
import { useCallNotifications } from "@/hooks/useCallNotifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";

const CallNotificationWrapper = ({ children }: { children: React.ReactNode }) => {
  useCallNotifications();
  return <>{children}</>;
}


export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <AuthProvider>
    <CallProvider>
      <CallNotificationWrapper>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </CallNotificationWrapper>
    </CallProvider>
    </AuthProvider>
  );
}
