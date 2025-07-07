"use client";
import { api } from "@/api";
import { apiUrl } from "@/constants";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

type TwoFactorPopupProps = {
  user_id: number,
  onClose: () => void;
};


export default function TwoFactorPopup({ user_id, onClose }: TwoFactorPopupProps) {
  const [code, setCode] = useState("");
  const router = useRouter();
  

  const { mutate: verify, isPending } = useMutation({
     mutationFn: api.verify2fa,
     onSuccess: () => {
        router.push("/")
      }
     
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const reqData = {user_id: user_id, code: code}
    verify(reqData);

  };

  return (
    <div className="fixed top-0 left-0 w-full h-full bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-md shadow-md text-black w-[300px]">
        <h2 className="text-xl font-bold mb-4">Enter 2FA Code</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="6-digit code"
            className="w-full border border-gray-300 px-3 py-2 mb-4 rounded-sm"
          />
          <div className="flex justify-between">
            <button
              type="submit"
              className="bg-purple-600 text-white px-4 py-2 rounded-sm"
            >
              Verify
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 underline"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
