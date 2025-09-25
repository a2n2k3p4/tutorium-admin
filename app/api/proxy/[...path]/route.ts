import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const baseFromSingle = (process.env.API_BASE_URL ?? '').replace(/\/+$/, '');
const baseFromParts = [
    (process.env.API_URL ?? '').replace(/\/+$/, ''),
    process.env.PORT ? `:${process.env.PORT}` : '',
].join('');
const BASE = baseFromSingle || baseFromParts;

if (!BASE) {
    throw new Error('Missing API_BASE_URL or (API_URL + PORT) in environment');
}

type Ctx = { params: Promise<{ path: string[] }> };

async function handler(req: NextRequest, ctx: Ctx) {
    const { path } = await ctx.params;
    const url = new URL(req.url);
    const target = `${BASE}/${path.join('/')}${url.search}`;

    const res = await fetch(target, {
        method: req.method,
        headers: {
            accept: req.headers.get('accept') ?? 'application/json',
            'content-type': req.headers.get('content-type') ?? 'application/json',
            ...(req.headers.get('authorization')
                ? { authorization: req.headers.get('authorization') as string }
                : {}),
        },
        body: ['GET', 'HEAD'].includes(req.method) ? undefined : await req.arrayBuffer(),
        cache: 'no-store',
        redirect: 'manual',
    });

    return new Response(res.body, {
        status: res.status,
        headers: {
            'content-type': res.headers.get('content-type') ?? 'application/json',
        },
    });
}

export { handler as GET, handler as POST, handler as PUT, handler as DELETE, handler as OPTIONS };
