// lib/api.ts
import { fetcher } from "./fetcher";

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
};
