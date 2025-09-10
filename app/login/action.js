'use server';

import { SignJWT, importJWK } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function login(prevState, formData) {
    const username = formData.get('username');
    const password = formData.get('password');
    console.log({ username, password });

    if (username !== 'admin' || password !== 'password') {
        return { message: 'Login Fail!' };
    }

    const secretJWK = {
        kty: 'oct',
        k: process.env.JOSE_SECRET,
    };

    const secretKey = await importJWK(secretJWK, 'HS256');
    const token = await new SignJWT({ username })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(secretKey);
    const cookieStore = await cookies();
    cookieStore.set('token', token);
    redirect('/');
}