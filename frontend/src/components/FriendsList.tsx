"use client"

import { api } from "@/api";
import { useAuth } from "@/AuthContext";
import { FriendRequest, User } from "@/types";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

type Tab = "friends" | "requests";


export const FriendsList = ({ activeTab }: { activeTab: "friends" | "requests" }) => {
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


  if (!user) return null;

  const displayedData = activeTab === "friends" ? friends : friendRequests;
  const title = activeTab === "friends" ? "Friends" : "Friend Requests";

  return (
    <div className="w-100 flex flex-col gap-4 font-mono">
      {activeTab == "friends" ? <FriendList title={title} data={displayedData} refetch={refetch}/> : 
      
      <FriendRequestList  title={title} data={displayedData} refetch={refetch} />
      }
    </div>
  );
};


type FriendProps = {
  title: string;
  data: FriendRequest[] | null;
  refetch: () => void; 
};

const FriendList = ({ title, data, refetch }: FriendProps) => {
  return <>
    <div className="bg-neutral-900 p-4 rounded-xl">
    <h2 className="text-xl mb-4">{title}</h2>
    {data && data.length > 0 ? (
      data.map((friend) => (
        <FriendCard key={friend.id} username={friend.from_user.username}></FriendCard>


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

};

const FriendRequestList = ({title, data, refetch} : FriendRequestProps) => {


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
        <FriendCard key={friend.id} username={friend.from_user.username} onAccept={()=>onAccept({ request_id: friend.id })} onReject={()=>{onReject({ request_id: friend.id })}}></FriendCard>

      ))}
    </div>

  </>


}



const FriendCard = ({
  username,
  onAccept,
  onReject,
}: {
  username: string;
  onAccept?: () => void;
  onReject?: () => void;
}) => (
  <div className="bg-neutral-800 hover:bg-neutral-700 my-2 px-2 py-2 rounded-xl flex items-center justify-between min-w-full">
    <div className="flex items-center gap-2">
      <img src="/media/empty-pfp.png" alt="Profile picture" width={50} height={50} />
      <span>{username}</span>
    </div>
    {(onAccept || onReject) && (
      <div className="flex gap-2">
        {onAccept && (
          <button className="bg-green-700 hover:bg-green-600 px-2 py-1 rounded text-sm" onClick={onAccept}>
            Accept
          </button>
        )}
        {onReject && (
          <button className="bg-red-700 hover:bg-red-600 px-2 py-1 rounded text-sm" onClick={onReject}>
            Reject
          </button>
        )}
      </div>
    )}
  </div>
);