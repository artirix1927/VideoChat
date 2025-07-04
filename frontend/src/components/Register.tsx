"use client";


import '../styles/register.css'

import { useState } from "react";
import { useMutation } from '@tanstack/react-query';
import { apiUrl } from '@/constants';
import { useRouter } from "next/navigation";

type RegisterData = {
    username: string;
    email: string;
    password: string;
    confirmPassword?: string; // optional field example
};


async function registerUser(data: { username: string; password: string, email: string}) {
  const res = await fetch(`${apiUrl}/user/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error("Registration failed");
  return res.json();
}



export const RegisterForm = () =>{
  const [formData, setFormData] = useState<RegisterData>({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const { mutate } = useMutation({
    mutationFn: registerUser,
  });

  const router = useRouter();


  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const samePasswords = formData.password == formData.confirmPassword
    if (samePasswords){
      const reqData = {username: formData.username, password:formData.password, email:formData.email}
      mutate(reqData, {
        onSuccess: () => {
          router.push("/auth/login");
        },
      });
    }
  }

  return (
    <div className="form-wrapper font-mono">
      <form className="form" onSubmit={(e) => { e.preventDefault(); handleSubmit(e); }}>
        <input className="input-field" placeholder="username..." name="username" value={formData.username} onChange={handleChange} />
        <input className="input-field" placeholder="email..." name="email" value={formData.email} onChange={handleChange} />
        <input className="input-field" placeholder="password..." type="password" name="password" value={formData.password} onChange={handleChange} />
        <input className="input-field" placeholder="repeat password..." type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} />
        <button className="submit-btn py-1 px-1 mt-4 rounded-sm border border-white" type="submit">Sign Up!</button>


        <a href="/auth/login" className='login-or-register'>¿ already have an account ?</a>
      </form>

    </div>
  );
}
