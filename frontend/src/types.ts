export type User = {
    id: number;
    username: string;
    email: string;
};
  
  
export type AuthContextType = {
    user: User | null;
    setUser: (user: User | null) => void;
    loading: boolean;
    revalidate: () => Promise<void>; // Add this
};


export type FriendRequest = {
    id: number;
    from_user: User;
    to_user: number;
    status: "pending" | "accepted" | "rejected";
};

