import { describe, expect, test } from 'vitest';
import { ApiError, api } from './api';
import { setAdminMode } from './adminMode';
import { jsonResponse, stubFetch } from './test/helpers';

describe('api error mapping', () => {
  test('app errors use `error` as the code and pass the Chinese message through', async () => {
    stubFetch({ 'GET /api/me': jsonResponse({ error: 'unauthenticated', message: '请先登录。' }, 401) });
    const err = await api.me().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(401);
    expect((err as ApiError).code).toBe('unauthenticated');
    expect((err as ApiError).message).toBe('请先登录。');
  });

  test('magic-link errors use `status` as the code', async () => {
    stubFetch({ 'POST /auth/verify-code': jsonResponse({ status: 'expired', message: '登录链接已过期' }, 410) });
    const err = (await api.verifyCode('a@b.c', '123456', null).catch((e: unknown) => e)) as ApiError;
    expect(err.code).toBe('expired');
    expect(err.status).toBe(410);
  });

  test('non-JSON 5xx (proxy down) becomes a generic Chinese message', async () => {
    stubFetch({ 'GET /api/events': new Response('<html>502</html>', { status: 502 }) });
    const err = (await api.listEvents('upcoming').catch((e: unknown) => e)) as ApiError;
    expect(err.code).toBe('http_502');
    expect(err.message).toContain('服务器');
  });

  test('204 resolves to undefined and mutations send JSON with same-origin credentials', async () => {
    const { calls, fn } = stubFetch({ 'POST /auth/logout': jsonResponse(null, 204) });
    await expect(api.logout()).resolves.toBeUndefined();
    expect(calls[0]).toMatchObject({ method: 'POST', path: '/auth/logout', body: {} });
    expect(fn.mock.calls[0]?.[1]).toMatchObject({ credentials: 'same-origin', headers: { 'Content-Type': 'application/json' } });
  });

  test('群主模式 adds the X-Admin-Mode header to every request, and only then', async () => {
    const { fn } = stubFetch({ 'GET /api/events': jsonResponse({ events: [] }) });
    await api.listEvents('upcoming');
    expect((fn.mock.calls[0]?.[1]?.headers as Record<string, string>)['X-Admin-Mode']).toBeUndefined();
    setAdminMode(true);
    try {
      await api.listEvents('upcoming');
      expect((fn.mock.calls[1]?.[1]?.headers as Record<string, string>)['X-Admin-Mode']).toBe('1');
    } finally {
      setAdminMode(false);
    }
  });

  test('verifyCode only sends `next` when there is one', async () => {
    const { calls } = stubFetch({ 'POST /auth/verify-code': jsonResponse({ status: 'ok', redirectTo: '/', isNew: false }) });
    await api.verifyCode('a@b.c', '123456', null);
    await api.verifyCode('a@b.c', '123456', '/events/1');
    expect(calls[0]?.body).toEqual({ email: 'a@b.c', code: '123456' });
    expect(calls[1]?.body).toEqual({ email: 'a@b.c', code: '123456', next: '/events/1' });
  });
});
