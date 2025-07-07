import React, { createContext, useContext, useState, useEffect } from "react";

type User = {
  id: number;
  username: string;
  email: string;
};


type AuthContextType = {
  user: User | null;
  setUser: (user: User | null) => void;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const fetchUser = async (): Promise<User | null> => {
    const res = await fetch("http://localhost:8000/user/", {
      credentials: "include",
    });
    if (!res.ok) return null;
    return await res.json();
  };

  const refreshAccessToken = async (): Promise<undefined> => {
    await fetch("http://localhost:8000/user/verify-referesh-token", {
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

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};
