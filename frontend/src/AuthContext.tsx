import React, { createContext, useContext, useState, useEffect } from "react";
import { apiUrl } from "./constants";

type User = {
  id: number;
  username: string;
  email: string;
};


type AuthContextType = {
  user: User | null;
  setUser: (user: User | null) => void;
  loading: boolean;
  revalidate: () => Promise<void>; // Add this
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const fetchUser = async (): Promise<User | null> => {
    const res = await fetch(`${apiUrl}/user/`, {
      credentials: "include",
    });
    if (!res.ok) return null;
    return await res.json();
  };

  const refreshAccessToken = async (): Promise<undefined> => {
    await fetch(`${apiUrl}/user/verify-referesh-token`, {
      credentials: "include",
    });
  };

  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const initializeUser = async () => {
      let userData = await fetchUser();

      if (!userData) {
        await refreshAccessToken();
        userData = await fetchUser();
      }

      setUser(userData);
      setLoading(false);
    };

    initializeUser();
  }, []);


  const revalidate = async () => {
    setLoading(true);
    try {
      let userData = await fetchUser();
      if (!userData) {
        await refreshAccessToken();
        userData = await fetchUser();
      }
      setUser(userData);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, revalidate }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};
