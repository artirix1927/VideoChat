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


export type SignalMessage =
  | { type: 'join-call'; userId: number; from:
    number, userData?: { userId: number;username?: string;}}
  | { type: 'new-peer'; peerId: number; from: number, userData?: {userId: number;username?: string;} }
  | { type: 'peer-list'; peers: number[]; from: number }
  | { type: 'offer'; sdp: string; target: number; from: number, userData: User}
  | { type: 'answer'; sdp: string; target: number; from: number, userData?: {userId: number; username?: string}}
  | { type: 'ice-candidate'; candidate: RTCIceCandidateInit; 
   target: number; from: number,  userData?: {userId: number;username?: string;}}
  | { type: 'peer-disconnected'; peerId: number; from: number }
  | { type: 'call-invite'; callId: string; from: number }
  | { type: 'call-accept'; callId: string; from: number }  
  | { type: 'call-decline'; callId: string; from: number }  
  | { type: 'ping' }
  | { type: 'pong' }
  
export type RemotePeer = {
    id: number
    stream: MediaStream
    userData?: {
        userId: number;
        username?: string;
    };
}
export type RemoteStream  = {
    stream: MediaStream;
    userData?: {
      userId: number;
      username?: string;
    };
  }