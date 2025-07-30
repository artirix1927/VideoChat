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



export type Message = {
    id: number;
    sender_id: number;
    content: string;
    timestamp: string;
  };
  

export type ChatMember = {
    user_id: number
    user: User


}

export type Chat = {
    id: number;
    created_at: Date;
    is_group: boolean;
    members: ChatMember[];
}