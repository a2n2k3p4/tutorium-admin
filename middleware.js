import { NextResponse } from "next/server";
import { jwtVerify, importJWK } from "jose";

export async function middleware(request) {
    if (request.nextUrl.pathname === '/login') {
        return NextResponse.next();
    }

    try {
        const token = request.cookies.get('token')?.value;
        const secretJWK = {
            kty: 'oct',
            k: process.env.JOSE_SECRET,
        };
        const secretKey = await importJWK(secretJWK, 'HS256');
        const { payload } = await jwtVerify(token, secretKey);
        if (payload.username !== 'admin') {
            throw new Error('username incorrect');
        }
        return NextResponse.next();
    } catch (error) {
        return NextResponse.redirect(new URL('/login', request.url));
    }
}

export const config = {
    matcher: [
        '/((?!login|_next|favicon.ico|api|public).*)',
    ],
};