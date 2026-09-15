import { useSyncExternalStore } from 'react';

/**
 * 群主模式: while on, an admin gets host controls on every event and the API
 * client sends `X-Admin-Mode: 1` so the backend grants them. Off by default
 * and remembered per browser, so an admin browsing normally cannot change
 * someone else's event by accident. Only admins can turn it on (the backend
 * ignores the header for everyone else).
 */
const KEY = 'kaiju.adminMode';
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function isAdminMode(): boolean {
  return read();
}

export function setAdminMode(on: boolean): void {
  try {
    if (on) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch {
    // private mode etc.: the toggle just does not persist
  }
  for (const l of listeners) l();
}

export function useAdminMode(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => false,
  );
  return [on, setAdminMode];
}
