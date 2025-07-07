"use client";

import { useAuth } from "@/AuthContext";
import { useRouter } from "next/navigation";


export const Navbar = () => {
    const router = useRouter();

    const { user, loading } = useAuth();

    if (loading) return null; // or a loading skeleton/spinner

 
    return <>
        <div className="navbar grid grid-cols-3 items-center py-4 px-20 font-mono">
        {/* Left */}
        <div><h6 className="text-xl font-bold">GAME\W.ME</h6></div>

        {/* Center */}
        <div className="flex justify-center gap-4">
            <label>Why Us?</label>
            <label>Product</label>
            <label>Solutions</label>
            <label>Resources</label>
            <label>Reviews</label>
        </div>

        {/* Right */}
        <div className="flex justify-end gap-6">
            {!user && <>
            <button className="py-1 px-3 rounded-sm text-lg border border-white" onClick={() => router.push("/auth/login")}>SIGN IN</button>
            <button className="py-1 px-3 rounded-sm text-lg border border-white bg-purple-700" onClick={() => router.push("/auth/register")}>SIGN UP</button>
            </>}
        </div>
        </div>

    </>
}