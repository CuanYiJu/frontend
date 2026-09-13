import { Link, NavLink, Outlet } from 'react-router';
import { useSession } from '../session';

export function Layout() {
  const { user, profile, isAdmin, pendingRequests } = useSession();
  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            <i /><i /><i /><i /><i /><i /><i /><i /><i />
          </span>
          开局 · 桌游群
        </Link>
        {user && profile?.status === 'active' ? (
          <nav className="nav">
            <NavLink to="/" end>
              局
            </NavLink>
            <NavLink to="/me">我的</NavLink>
            {isAdmin ? (
              <NavLink to="/admin">
                名单{pendingRequests > 0 ? ` (${pendingRequests})` : ''}
              </NavLink>
            ) : null}
          </nav>
        ) : null}
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
