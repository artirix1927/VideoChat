// lib/api.ts
import { chatFetcher, fetcher } from "./fetcher";
import { FriendRequest } from "./types";



export const api = {

    register: (data: { username: string; password: string, email: string}) => 
    fetcher("/user/create", {method: "POST",
        body: JSON.stringify(data),
    }),


    login: (data: { username: string; password: string }) =>
    fetcher<{ user_id: number }>("/user/login", {
        method: "POST",
        body: JSON.stringify(data),
    }),

    verify2fa: (data: { user_id: number; code: string }) =>
    fetcher<{ access_token: string; refresh_token: string }>("/user/verify-2fa", {
        method: "POST",
        body: JSON.stringify(data),
    }),

    getFriends: (data: { user_id: number; }) =>
        chatFetcher<{ friends: FriendRequest[] }>(`/chat/friends?user_id=${data.user_id}`, {
            method: "GET",
        }),

    getFriendRequests: (data: { user_id: number; }) =>
        chatFetcher<{ friend_requests: FriendRequest[] }>(`/chat/friend-requests?user_id=${data.user_id}`, {
            method: "GET",
        }),

    

};
