'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export type LoginState = { message: string };

const baseFromSingle = (process.env.API_BASE_URL ?? '').replace(/\/+$/, '');
const baseFromParts = [
    (process.env.API_URL ?? '').replace(/\/+$/, ''),
    process.env.PORT ? `:${process.env.PORT}` : '',
].join('');
const BASE = baseFromSingle || baseFromParts;
if (!BASE) throw new Error('Missing API_BASE_URL or (API_URL + PORT)');

export async function login(
    _prev: LoginState,
    formData: FormData
): Promise<LoginState> {
    const username = formData.get('username')?.toString().trim();
    const password = formData.get('password')?.toString();
    if (!username || !password) return { message: 'Username and password are required.' };

    let token: string | null = null;
    let studentId: string | null = null;

    try {
        const res = await fetch(`${BASE}/login`, {
            method: 'POST',
            headers: { accept: 'application/json', 'content-type': 'application/json' },
            body: JSON.stringify({ username, password }),
            cache: 'no-store',
        });

        const text = await res.text();
        const data = text ? JSON.parse(text) : null;

        if (!res.ok) {
            const msg =
                (data && typeof data === 'object' && (data.message || data.error)) ||
                (typeof data === 'string' ? data : '') ||
                `HTTP ${res.status}`;
            return { message: `${msg}` };
        }

        token = data?.token ?? null;
        studentId = data?.user?.student_id ?? null;

        if (!token || !studentId) {
            return { message: 'Invalid login response: missing token or student_id.' };
        }
    } catch (e: any) {
        return { message: `${e.message}` };
    }

    let userId: number | null = null;
    try {
        const res = await fetch(`${BASE}/users`, {
            headers: {
                accept: 'application/json',
                authorization: `Bearer ${token}`,
            },
            cache: 'no-store',
        });
        const text = await res.text();
        if (!res.ok) {
            return { message: `Fetch users failed: ${text || res.statusText}` };
        }
        const users: any[] = text ? JSON.parse(text) : [];
        const me = Array.isArray(users)
            ? users.find(
                (u) => String(u.student_id) === String(studentId)
            )
            : null;
        const resolvedId = Number(me?.ID);
        if (!Number.isFinite(resolvedId)) {
            return { message: 'Cannot resolve user id from /users.' };
        }
        userId = resolvedId;
    } catch (e: any) {
        return { message: `Resolve user id failed: ${e.message}` };
    }

    try {
        const res = await fetch(`${BASE}/admins`, {
            headers: {
                accept: 'application/json',
                authorization: `Bearer ${token}`,
            },
            cache: 'no-store',
        });
        const text = await res.text();
        if (!res.ok) {
            const msg =
                (text && (() => { try { return JSON.parse(text).message; } catch { return text; } })()) ||
                res.statusText;
            return { message: `Admin check failed: ${msg}` };
        }

        const admins: any[] = text ? JSON.parse(text) : [];
        const isAdmin =
            Array.isArray(admins) &&
            admins.some((a) => Number(a.user_id) === Number(userId));

        if (!isAdmin) {
            return { message: 'This account is not an admin.' };
        }
    } catch (e: any) {
        return { message: `Admin check failed: ${e.message}` };
    }

    (await cookies()).set('token', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60,
    });

    redirect('/');
}
