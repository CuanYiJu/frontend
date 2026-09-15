/** Types mirror site/backend/src/services/*.ts. Keep them in sync by hand for now. */
import { isAdminMode } from './adminMode';

export interface User {
  id: string;
  email: string;
}

/** pending = waiting for the admin; rejected / removed = admin said no, may apply again. */
export type ProfileStatus = 'pending' | 'active' | 'rejected' | 'removed';

export interface Profile {
  userId: string;
  nickname: string;
  /** The member's WeChat name. Fixed once active. */
  wechatName: string;
  /** The 打招呼 they applied with. */
  greeting: string | null;
  bio: string | null;
  status: ProfileStatus;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalRequest {
  userId: string;
  nickname: string;
  wechatName: string;
  greeting: string | null;
  email: string;
  requestedAt: string;
}

export interface Member {
  userId: string;
  nickname: string;
  wechatName: string;
  email: string;
  joinedAt: string;
  isAdmin: boolean;
}

export type EventKind = 'regular' | 'adhoc';
export type EventStatus = 'open' | 'cancelled';
export type RegistrationStatus = 'confirmed' | 'waitlisted' | 'withdrawn' | 'removed';

export interface EventSummary {
  id: string;
  seriesId: string | null;
  kind: EventKind;
  title: string;
  games: string | null;
  description: string | null;
  location: string;
  startsAt: string;
  endsAt: string;
  durationMin: number;
  capacity: number;
  minSize: number;
  status: EventStatus;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
  host: { id: string; nickname: string };
  confirmedCount: number;
  waitlistCount: number;
  myStatus: RegistrationStatus | null;
  isHost: boolean;
  /** Host, or admin in 群主模式: may edit, cancel, remove players. */
  canManage: boolean;
  isPast: boolean;
}

export interface Participant {
  userId: string;
  nickname: string;
  wechatName: string | null;
  status: 'confirmed' | 'waitlisted';
  joinedAt: string;
}

export interface EventDetail extends EventSummary {
  participants: Participant[];
}

export interface EventInput {
  kind: EventKind;
  title: string;
  games: string | null;
  description: string | null;
  location: string;
  startsAt: string;
  durationMin: number;
  capacity: number;
  minSize: number;
  repeatWeeks: number;
}

export type ListScope = 'upcoming' | 'past' | 'mine';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/** Sent while 群主模式 is on; the backend only honours it for admins. */
export const ADMIN_MODE_HEADER = 'X-Admin-Mode';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (isAdminMode()) headers[ADMIN_MODE_HEADER] = '1';
  const res = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
  });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    // Non-JSON error page (proxy down, etc.)
  }
  if (!res.ok) {
    // The magic-link routes use `status` for the error code; the app API uses `error`.
    const code = String(data.error ?? data.status ?? `http_${res.status}`);
    const message = String(data.message ?? (res.status >= 500 ? '服务器出了点问题，请稍后再试。' : '请求失败，请重试。'));
    throw new ApiError(res.status, code, message);
  }
  return data as T;
}

export const api = {
  me: () => request<{ user: User; profile: Profile | null; isAdmin: boolean; pendingRequests: number }>('GET', '/api/me'),
  saveProfile: (input: { nickname: string; wechatName?: string | null; greeting?: string | null; bio?: string | null }) =>
    request<{ profile: Profile }>('PUT', '/api/profile', input),

  // admin: membership
  listMembers: () => request<{ members: Member[] }>('GET', '/api/admin/members'),
  addMember: (input: { email: string; wechatName: string; nickname?: string | null }) =>
    request<{ profile: Profile; email: string; created: boolean }>('POST', '/api/admin/members', input),
  removeMember: (userId: string, note: string | null) =>
    request<{ profile: Profile; cancelledEvents: number; withdrawnFrom: number }>('DELETE', `/api/admin/members/${userId}`, { note }),
  listRequests: () => request<{ requests: ApprovalRequest[] }>('GET', '/api/admin/requests'),
  approveRequest: (userId: string) => request<{ profile: Profile }>('POST', `/api/admin/requests/${userId}/approve`, {}),
  rejectRequest: (userId: string, note: string | null) => request<{ profile: Profile }>('POST', `/api/admin/requests/${userId}/reject`, { note }),

  // events
  listEvents: (scope: ListScope) => request<{ events: EventSummary[] }>('GET', `/api/events?scope=${scope}`),
  searchEvents: (q: string) => request<{ events: EventSummary[] }>('GET', `/api/events/search?q=${encodeURIComponent(q)}`),
  getEvent: (id: string) => request<{ event: EventDetail }>('GET', `/api/events/${id}`),
  createEvent: (input: EventInput) => request<{ events: EventSummary[] }>('POST', '/api/events', input),
  updateEvent: (id: string, patch: Partial<Omit<EventInput, 'kind' | 'repeatWeeks'>>) =>
    request<{ event: EventSummary }>('PATCH', `/api/events/${id}`, patch),
  cancelEvent: (id: string, reason: string | null) => request<{ event: EventSummary }>('POST', `/api/events/${id}/cancel`, { reason }),
  join: (id: string) => request<{ status: 'confirmed' | 'waitlisted'; event: EventDetail }>('POST', `/api/events/${id}/join`, {}),
  leave: (id: string) => request<{ promoted: string[]; event: EventDetail }>('POST', `/api/events/${id}/leave`, {}),
  removeParticipant: (id: string, userId: string) =>
    request<{ promoted: string[]; event: EventDetail }>('DELETE', `/api/events/${id}/participants/${userId}`),

  // magic-link
  requestLink: (email: string) => request<{ status: 'sent'; email: string }>('POST', '/auth/magic-link', { email }),
  verifyCode: (email: string, code: string, next: string | null) =>
    request<{ status: 'ok'; redirectTo: string; isNew: boolean }>('POST', '/auth/verify-code', { email, code, ...(next ? { next } : {}) }),
  logout: () => request<void>('POST', '/auth/logout', {}),
};
