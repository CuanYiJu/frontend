import { useAdminMode } from '../adminMode';
import { useSession } from '../session';

/**
 * Switch for 群主模式. Rendered only for admins. While on, every event page
 * shows the host controls and API calls carry the admin-mode header.
 * The (invisible) checkbox covers the drawn track, so taps and clicks hit
 * the real control.
 */
export function AdminModeToggle({ compact = false }: { compact?: boolean }) {
  const { isAdmin } = useSession();
  const [on, setOn] = useAdminMode();
  if (!isAdmin) return null;
  return (
    <label className={`switch${compact ? ' compact' : ''}`}>
      <span className="switch-control">
        <input type="checkbox" role="switch" aria-label="群主模式" checked={on} onChange={(e) => setOn(e.target.checked)} />
        <span className="switch-track" aria-hidden="true">
          <span className="switch-thumb" />
        </span>
      </span>
      <span className="switch-text">
        <strong>群主模式{on ? '：开' : '：关'}</strong>
        {compact ? null : <span className="muted small"> 开着的时候可以编辑、取消任何人的局和移出报名的人；平时关着，免得误碰。</span>}
      </span>
    </label>
  );
}
