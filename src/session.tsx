import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { ApiError, api, type Profile, type User } from './api';

interface SessionState {
  loading: boolean;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  /** Admins only: profiles waiting for approval. */
  pendingRequests: number;
  refresh: () => Promise<void>;
  setProfile: (p: Profile) => void;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const me = await api.me();
      setUser(me.user);
      setProfileState(me.profile);
      setIsAdmin(me.isAdmin);
      setPendingRequests(me.pendingRequests);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setUser(null);
        setProfileState(null);
        setIsAdmin(false);
      } else {
        throw err;
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh().catch(() => setLoading(false));
  }, [refresh]);

  const value = useMemo<SessionState>(
    () => ({
      loading,
      user,
      profile,
      isAdmin,
      pendingRequests,
      refresh,
      setProfile: setProfileState,
      logout: async () => {
        await api.logout();
        setUser(null);
        setProfileState(null);
        setIsAdmin(false);
      },
    }),
    [loading, user, profile, isAdmin, pendingRequests, refresh],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession outside SessionProvider');
  return ctx;
}

/** Wrap pages that need a logged-in user with a profile. */
export function RequireMember({ children }: { children: ReactNode }) {
  const { loading, user, profile } = useSession();
  const location = useLocation();
  if (loading) return <p className="muted center">加载中…</p>;
  const next = location.pathname + location.search;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  if (!profile || profile.status !== 'active') return <Navigate to={`/onboarding?next=${encodeURIComponent(next)}`} replace />;
  return <>{children}</>;
}

/** Wrap pages that need a login but not a profile yet (onboarding). */
export function RequireUser({ children }: { children: ReactNode }) {
  const { loading, user } = useSession();
  const location = useLocation();
  if (loading) return <p className="muted center">加载中…</p>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <>{children}</>;
}
