import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const baseFromSingle = (process.env.API_BASE_URL ?? '').replace(/\/+$/, '');
const baseFromParts = [
    (process.env.API_URL ?? '').replace(/\/+$/, ''),
    process.env.PORT ? `:${process.env.PORT}` : '',
].join('');
const BASE = baseFromSingle || baseFromParts;
if (!BASE) throw new Error('Missing API_BASE_URL or (API_URL + PORT) in environment');

type Ctx = { params: { path: string[] } };

async function handler(req: NextRequest, { params }: Ctx) {
    const target = `${BASE}/${params.path.join('/')}${new URL(req.url).search}`;

    const token = (await cookies()).get('token')?.value;
    const incomingAuth = req.headers.get('authorization') || undefined;
    const authHeader = incomingAuth ?? (token ? `Bearer ${token}` : undefined);

    const headers: Record<string, string> = {
        accept: req.headers.get('accept') ?? 'application/json',
    };
    const contentType = req.headers.get('content-type');
    if (!['GET', 'HEAD'].includes(req.method) && contentType) {
        headers['content-type'] = contentType;
    }
    if (authHeader) headers.authorization = authHeader;

    const upstream = await fetch(target, {
        method: req.method,
        headers,
        body: ['GET', 'HEAD'].includes(req.method) ? undefined : await req.arrayBuffer(),
        cache: 'no-store',
        redirect: 'manual',
    });

    const res = new Response(upstream.body, {
        status: upstream.status,
        headers: {
            'content-type': upstream.headers.get('content-type') ?? 'application/json',
        },
    });
}

export { handler as GET, handler as POST, handler as PUT, handler as DELETE, handler as OPTIONS };
