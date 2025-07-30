"use client"

import { api } from "@/api";
import { useAuth } from "@/AuthContext";
import { FriendRequest, User } from "@/types";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";

type Tab = "friends" | "requests";


export const FriendsList = () => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<FriendRequest[] | null>(null);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[] | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("friends");

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

  if (!user) return null;

  const displayedData = activeTab === "friends" ? friends : friendRequests;
  const title = activeTab === "friends" ? "Friends" : "Friend Requests";

  return (
    <div className="px-12 py-4 w-100 flex flex-col gap-4 font-mono">
      <TabSelector active={activeTab} onChange={setActiveTab} />
      <UserList title={title} data={displayedData} />
    </div>
  );
};

type TabSelectorProps = {
  active: Tab;
  onChange: (tab: Tab) => void;
};

const TabSelector = ({ active, onChange }: TabSelectorProps) => (
  <div className="flex gap-4">
    {(["friends", "requests"] as Tab[]).map((tab) => (
      <button
        key={tab}
        onClick={() => onChange(tab)}
        className={`px-3 py-1 rounded-xl ${
          active === tab ? "bg-neutral-700" : "bg-neutral-800 hover:bg-neutral-700"
        }`}
      >
        {tab === "friends" ? "Friends" : "Friend Requests"}
      </button>
    ))}
  </div>
);

type UserListProps = {
  title: string;
  data: FriendRequest[] | null;
};

const UserList = ({ title, data }: UserListProps) => (
  <div className="bg-neutral-900 p-4 rounded-xl">
    <h2 className="text-xl mb-2">{title}</h2>
    {data && data.length > 0 ? (
      data.map((friend) => (
        <button className="bg-neutral-800 hover:bg-neutral-700 my-2 
        px-2 py-2 rounded-xl flex flex-row align-middle gap-2 min-w-full 
        focus:outline-neutral-700 active:bg-neutral-900 focus:outline-2 focus:outline-offset-2"
        key={friend.id}>
          
        <img src="/media/empty-pfp.png" alt="Profile picture" width={50} height={50} />
        {friend.from_user.username}</button>

      ))
    ) : (
      <div className="text-neutral-500 italic">No {title.toLowerCase()}.</div>
    )}
  </div>
);