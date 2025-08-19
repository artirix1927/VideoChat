"use client"

import { api } from "@/api";
import { useAuth } from "@/AuthContext";
import { Chat, FriendRequest, User } from "@/types";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

import { ActivePanel } from "../../app/chat/text/page";

type FriendListProps = { 
  activeTab: "friends" | "requests", 
  setSelectedChat: (chatId: number) => void, 
  setActivePanel:(tab: ActivePanel) => void 
}



export const FriendsList = ({ activeTab, setSelectedChat, setActivePanel }: FriendListProps) => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<FriendRequest[] | null>(null);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[] | null>(null);

  const { mutate: getFriends } = useMutation({
    mutationFn: api.getFriends,
    onSuccess: (data) => setFriends(data.friends),
  });

  const { mutate: getFriendRequests } = useMutation({
    mutationFn: api.getFriendRequests,
    onSuccess: (data) => setFriendRequests(data.friend_requests),
  });

  useEffect(() => {
    if (!user) return;
    if (!friends) getFriends({ user_id: user.id });
    if (!friendRequests) getFriendRequests({ user_id: user.id });
  }, [user]);

  const refetch = useCallback(() => {
    if (!user) return;
    getFriends({ user_id: user.id });
    getFriendRequests({ user_id: user.id });
  }, [user, getFriends, getFriendRequests]);


  const onOpenChat = (chatId: number) => {
    setSelectedChat(chatId)
    setActivePanel("chats");
  }

  if (!user) return null;

  const displayedData = activeTab === "friends" ? friends : friendRequests;
  const title = activeTab === "friends" ? "Friends" : "Friend Requests";

  return (
    <div className="w-100 flex flex-col gap-4 font-mono">
      {activeTab == "friends" ? 
      <FriendList title={title} data={displayedData} refetch={refetch} onOpenChat={onOpenChat}/> : 
      <FriendRequestList title={title} data={displayedData} refetch={refetch} onOpenChat={onOpenChat} />
      }
    </div>
  );
};


type FriendProps = {
  title: string;
  data: FriendRequest[] | null;
  refetch: () => void; 
  onOpenChat: (chatId: number) => void;
};

const FriendList = ({ title, data, refetch, onOpenChat}: FriendProps) => {
  return <>
    <div className="bg-neutral-900 p-4 rounded-xl">
    <h2 className="text-xl mb-4">{title}</h2>
    {data && data.length > 0 ? (
      data.map((friend) => (
        <FriendCard key={friend.id} userId={friend.from_user.id} username={friend.from_user.username} onOpenChat={onOpenChat}></FriendCard>


      ))
    ) : (
      <div className="text-neutral-500 italic">No {title.toLowerCase()}.</div>
    )}
  </div>
  
  </>
}


type FriendRequestProps = {
  title: string;
  data: FriendRequest[] | null;
  refetch: () => void; 
  onOpenChat: (chatId: number) => void;

};

const FriendRequestList = ({title, data, refetch, onOpenChat} : FriendRequestProps) => {


  const { mutate: onAccept } = useMutation({
    mutationFn: api.acceptFriendRequest,
    onSuccess: () => {
      refetch()
    },
  });
  const { mutate: onReject } = useMutation({
    mutationFn: api.rejectFriendRequest,
    onSuccess: () => {
      refetch()
    },
  });


  return <>
    <div className="bg-neutral-900 p-4 rounded-xl">
      <h2 className="text-xl mb-4">{title}</h2>
      {data && data.length>0 && data.map((friend) => (
        <FriendCard key={friend.id} userId={friend.from_user.id}
                    username={friend.from_user.username} 
                    onAccept={()=>onAccept({ request_id: friend.id })} 
                    onReject={()=>{onReject({ request_id: friend.id })}}
                    onOpenChat={onOpenChat}
        ></FriendCard>

      ))}
    </div>

  </>


}


const FriendCard = ({
  username,
  userId,
  onAccept,
  onReject,
  onOpenChat,
}: {
  username: string;
  userId: number;
  onAccept?: () => void;
  onReject?: () => void;
  onOpenChat: (chatId: number) => void;
}) => {

  const { user } = useAuth();

  if (!user) return null

  const { mutate: createChat } = useMutation({
      mutationFn: api.getOrCreateChat, // expects { member_ids: number[] }
      onSuccess: (data) => {
        console.log(data)
        onOpenChat(data.chat.id)
      },
    });

  const handleCreateChat = (targetUserId: number) => {
    console.log([targetUserId, user.id])
    createChat({ members: [targetUserId, user.id] });
  };





  return <div className="bg-neutral-800 hover:bg-neutral-700 my-2 px-2 py-2 rounded-xl flex items-center justify-between min-w-full">
    <div className="flex items-center gap-2">
      <img src="/media/empty-pfp.png" alt="Profile picture" width={50} height={50} />
      <span>{username}</span>
    </div>
      <div className="flex gap-2">

        {(!onAccept && !onReject ) ?
          <button
            onClick={() => handleCreateChat(userId)}
            className="bg-blue-700 hover:bg-blue-600 text-white p-2 rounded"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.833L3 21l1.833-4A9.77 9.77 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </button>
      
          :
        
          (<><button
            className="bg-green-700 hover:bg-green-600 px-2 py-1 rounded text-sm"
            onClick={onAccept}
          >
            Accept
          </button>
          <button
            className="bg-red-700 hover:bg-red-600 px-2 py-1 rounded text-sm"
            onClick={onReject}
          >
            Reject
          </button>
          </>)
        }
      </div>
  </div>
};