/** @jest-environment node */
import { middleware } from './middleware';

jest.mock('jose', () => ({
  importJWK: jest.fn(async () => ({})),
  jwtVerify: jest.fn(async () => ({ payload: { username: 'admin' } })),
}));

jest.mock('next/server', () => ({
  NextResponse: {
    next: jest.fn(() => ({ type: 'next' })),
    redirect: jest.fn((url: any) => ({ type: 'redirect', url })),
  },
}));

describe('middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JOSE_SECRET = 'test-secret';
  });

  const makeReq = (pathname: string, token?: string) => ({
    nextUrl: { pathname },
    url: `http://localhost${pathname}`,
    cookies: {
      get: (_: string) => (token ? { value: token } : undefined),
    },
  }) as any;

  it('allows /login without auth', async () => {
    const { NextResponse } = await import('next/server');
    await middleware(makeReq('/login'));
    expect(NextResponse.next).toHaveBeenCalled();
  });

  it('redirects to /login when no token', async () => {
    const jose = await import('jose');
    (jose.jwtVerify as jest.Mock).mockRejectedValueOnce(new Error('no token'));
    const { NextResponse } = await import('next/server');
    await middleware(makeReq('/'));
    expect(NextResponse.redirect).toHaveBeenCalled();
    const call = (NextResponse.redirect as jest.Mock).mock.calls[0][0];
    expect(String(call)).toContain('/login');
  });

  it('calls next() when token is valid and user is admin', async () => {
    const { NextResponse } = await import('next/server');
    await middleware(makeReq('/', 'token123'));
    expect(NextResponse.next).toHaveBeenCalled();
  });

  it('redirects if username is not admin', async () => {
    const jose = await import('jose');
    (jose.jwtVerify as jest.Mock).mockResolvedValueOnce({ payload: { username: 'guest' } });
    const { NextResponse } = await import('next/server');
    await middleware(makeReq('/', 'token123'));
    expect(NextResponse.redirect).toHaveBeenCalled();
  });
});
