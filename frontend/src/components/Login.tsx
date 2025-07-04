"use client";


import '../styles/register.css'

import { useState } from "react";

type LoginData = {
    username: string;
    password: string;
};


import { apiUrl } from '@/constants';
import { useMutation } from '@tanstack/react-query';
import TwoFactorPopup from './TwoFactorPopUp';

async function loginUser(data: { username: string; password: string}) {
  const res = await fetch(`${apiUrl}/user/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error("Registration failed");
  return res.json();
}



export const LoginForm = () =>{
  const [formData, setFormData] = useState<LoginData>({
    username: "",
    password: "",
  });

  const [show2FA, setShow2FA] = useState(false);
  const [userId, setUserId] = useState();

  const { mutate, isPending, isSuccess, isError, error } = useMutation({
    mutationFn: loginUser,
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
   
    const reqData = {username: formData.username, password:formData.password}
    mutate(reqData, {
      onSuccess: (data) => {
        setShow2FA(true); // show 2FA popup
        setUserId(data.user_id)
        console.log(data)
      },
    });
  }
  

  return (
    <div className="form-wrapper font-mono">
      <form className="form" onSubmit={(e) => { e.preventDefault(); handleSubmit(e); }}>
        <input className="input-field" placeholder="username..." name="username" value={formData.username} onChange={handleChange} />
        <input className="input-field" placeholder="password..." type="password" name="password" value={formData.password} onChange={handleChange} />
        <button className="submit-btn py-1 px-1 mt-4 rounded-sm border border-white" type="submit">Sign In</button>

        <a href="/auth/register" className='login-or-register'>¿ Wanna sign up ?</a>
      </form>

      { (show2FA && userId) && (
            <TwoFactorPopup 
              user_id={userId}
              onClose={() => setShow2FA(false)}
            />
          )}
    </div>
  );
}
