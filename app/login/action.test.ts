/** @jest-environment node */
import { login } from './action';

jest.mock('jose', () => ({
  importJWK: jest.fn(async () => ({})),
  SignJWT: class {
    setProtectedHeader() { return this; }
    setIssuedAt() { return this; }
    setExpirationTime() { return this; }
    async sign() { return 'signed.token.value'; }
  },
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(async () => ({ set: jest.fn() })),
}));

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

describe('login action', () => {
  beforeEach(() => {
    process.env.JOSE_SECRET = 'test-secret';
    jest.clearAllMocks();
  });

  it('returns error message on invalid credentials', async () => {
    const formData = { get: (k: string) => (k === 'username' ? 'x' : 'y') } as any;
    const res = await login({}, formData);
    expect(res).toEqual({ message: 'Login Fail!' });
  });

  it('sets cookie and redirects on valid credentials', async () => {
    const headers = await import('next/headers');
    const { redirect } = await import('next/navigation');

    const formData = { get: (k: string) => (k === 'username' ? 'admin' : 'password') } as any;
    await login({}, formData);

    const cookiesCall = (headers.cookies as jest.Mock).mock.results[0];
    const cookieStore = await cookiesCall.value; // mocked cookies() resolves to store
    expect(cookieStore.set).toHaveBeenCalledWith('token', expect.any(String));
    expect((redirect as jest.Mock)).toHaveBeenCalledWith('/');
  });
});
