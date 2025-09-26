import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    if (
        pathname.startsWith('/login') ||
        pathname.startsWith('/api') ||
        pathname.startsWith('/_next') ||
        pathname === '/favicon.ico' ||
        /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$/.test(pathname)
    ) {
        return NextResponse.next();
    }

    const token = req.cookies.get('token')?.value;
    if (!token) {
        const url = req.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('redirect', pathname);
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!_next/|static/|favicon.ico|login|api).*)',
    ],
};
