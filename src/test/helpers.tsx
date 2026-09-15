import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { vi } from 'vitest';
import type { EventSummary, Profile } from '../api';

/** A JSON response for a stubbed fetch. */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Stub global fetch with a route table: `'POST /api/x' → response or handler`. */
export function stubFetch(routes: Record<string, Response | ((init: RequestInit | undefined) => Response)>) {
  const calls: { method: string; path: string; body: unknown }[] = [];
  const fn = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const path = url.replace(/^https?:\/\/[^/]+/, '');
    const method = (init?.method ?? 'GET').toUpperCase();
    calls.push({ method, path, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    const hit = routes[`${method} ${path}`] ?? routes[`${method} ${path.split('?')[0]}`];
    if (!hit) return jsonResponse({ error: 'not_found', message: `unstubbed ${method} ${path}` }, 404);
    return typeof hit === 'function' ? hit(init) : hit.clone();
  });
  vi.stubGlobal('fetch', fn);
  return { fn, calls };
}

/** Render a page under a router at `path`, with optional route params. */
export function renderAt(ui: ReactElement, path = '/', pattern = path.split('?')[0]) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={pattern} element={ui} />
        <Route path="*" element={<div data-testid="elsewhere">elsewhere</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

export const profile = (over: Partial<Profile> = {}): Profile => ({
  userId: 'u1',
  nickname: '小明',
  wechatName: '小明🎲',
  greeting: null,
  bio: null,
  status: 'active',
  reviewNote: null,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  ...over,
});

export const event = (over: Partial<EventSummary> = {}): EventSummary => ({
  id: 'e1',
  seriesId: null,
  kind: 'adhoc',
  title: '周六下午卡坦岛',
  games: '卡坦岛',
  description: null,
  location: '北约克',
  startsAt: new Date(Date.now() + 86_400_000).toISOString(),
  endsAt: new Date(Date.now() + 86_400_000 + 3 * 3_600_000).toISOString(),
  durationMin: 180,
  capacity: 4,
  minSize: 2,
  status: 'open',
  cancelReason: null,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  host: { id: 'h1', nickname: '局长' },
  confirmedCount: 1,
  waitlistCount: 0,
  myStatus: null,
  isHost: false,
  canManage: false,
  isPast: false,
  ...over,
});
