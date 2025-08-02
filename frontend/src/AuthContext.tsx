import React, { createContext, useContext, useState, useEffect } from "react";
import { apiUrl } from "./constants";
import { User, AuthContextType } from "./types";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchUser = async (): Promise<User | null> => {
    try {
      const res = await fetch(`${apiUrl}/user/`, { credentials: "include" });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  };

  const refreshAccessToken = async (): Promise<void> => {
    await fetch(`${apiUrl}/user/verify-referesh-token`, {
      credentials: "include",
    });
  };

  const initializeUser = async () => {
    let cachedUser: User | null = null;

    try {
      const fromStorage = localStorage.getItem("user");
      if (fromStorage) {
        cachedUser = JSON.parse(fromStorage);
        setUser(cachedUser);
        setLoading(false); // Show cached version instantly
      }
    } catch {
      localStorage.removeItem("user");
    }

    let freshUser = await fetchUser();

    if (!freshUser) {
      await refreshAccessToken();
      freshUser = await fetchUser();
    }

    if (freshUser) {
      setUser(freshUser);
      localStorage.setItem("user", JSON.stringify(freshUser));
    } else {
      setUser(null);
      localStorage.removeItem("user");
    }

    setLoading(false);
  };

  useEffect(() => {
    initializeUser();
  }, []);

  const revalidate = async () => {
    setLoading(true);
    try {
      let freshUser = await fetchUser();
      if (!freshUser) {
        await refreshAccessToken();
        freshUser = await fetchUser();
      }

      if (freshUser) {
        setUser(freshUser);
        localStorage.setItem("user", JSON.stringify(freshUser));
      } else {
        setUser(null);
        localStorage.removeItem("user");
      }
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
