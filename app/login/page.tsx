'use client';
import React, { useActionState } from "react";
import { login } from './action';

export default function LoginPage() {
    const initState = {
        message: ''
    }
    const [state, formAction] = useActionState(login, initState);

    return (
        <div className="min-h-[100dvh] grid place-items-center p-4">
            <form action={formAction} className="w-full max-w-sm grid gap-3 p-6 border rounded-xl">
                <h1 className="text-xl font-semibold">Admin Login</h1>
                <input className="border rounded px-3 py-2" placeholder="Username"
                    name="username" />
                <input className="border rounded px-3 py-2" type="password" placeholder="Password"
                    name="password" />
                <p className="text-red-500">{state?.message ?? ''}</p>
                <button className="rounded bg-gray-500 text-white py-2" type="submit">log in</button>
            </form>
        </div>
    );
}
