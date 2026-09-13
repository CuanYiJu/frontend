import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ApiError, api, type EventKind, type EventSummary, type ListScope } from '../api';
import { EventCard } from '../components/EventCard';
import { ErrorBanner } from '../components/Field';

const SCOPES: { key: ListScope; label: string }[] = [
  { key: 'upcoming', label: '即将开始' },
  { key: 'mine', label: '我参与的' },
  { key: 'past', label: '已结束' },
];

const KINDS: { key: EventKind | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'regular', label: '固定局' },
  { key: 'adhoc', label: '临时局' },
];

export function HomePage() {
  const [params, setParams] = useSearchParams();
  const scope = (SCOPES.find((s) => s.key === params.get('scope'))?.key ?? 'upcoming') as ListScope;
  const kind = (KINDS.find((k) => k.key === params.get('kind'))?.key ?? 'all') as EventKind | 'all';
  const [events, setEvents] = useState<EventSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setEvents(null);
    api
      .listEvents(scope)
      .then((r) => alive && setEvents(r.events))
      .catch((err) => alive && setError(err instanceof ApiError ? err.message : '加载失败。'));
    return () => {
      alive = false;
    };
  }, [scope]);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value === 'upcoming' || value === 'all') next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const visible = events?.filter((e) => kind === 'all' || e.kind === kind) ?? null;
  const upcoming = visible?.filter((e) => !e.isPast) ?? [];
  const past = visible?.filter((e) => e.isPast) ?? [];

  return (
    <>
      <div className="tabs" role="tablist">
        {SCOPES.map((s) => (
          <button key={s.key} role="tab" className={`chip${scope === s.key ? ' active' : ''}`} onClick={() => setParam('scope', s.key)}>
            {s.label}
          </button>
        ))}
        <span style={{ width: 8 }} />
        {KINDS.map((k) => (
          <button key={k.key} className={`chip${kind === k.key ? ' active' : ''}`} onClick={() => setParam('kind', k.key)}>
            {k.label}
          </button>
        ))}
      </div>
      <ErrorBanner message={error} />
      {visible === null && !error ? <p className="muted center">加载中…</p> : null}
      {visible !== null && visible.length === 0 ? (
        <div className="empty">
          {scope === 'upcoming' ? (
            <>
              还没有局。
              <br />
              <Link to="/events/new" style={{ color: 'var(--accent-text)', fontWeight: 600 }}>
                发一个？
              </Link>
            </>
          ) : scope === 'mine' ? (
            '你还没有报名或组织任何局。'
          ) : (
            '还没有结束的局。'
          )}
        </div>
      ) : null}
      <div className="stack">
        {scope === 'mine' && upcoming.length > 0 && past.length > 0 ? <h2>即将开始</h2> : null}
        {upcoming.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
        {scope === 'mine' && past.length > 0 ? <h2>已结束 / 已取消</h2> : null}
        {past.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
      </div>
      <Link to="/events/new" className="fab">
        ＋ 发一个局
      </Link>
    </>
  );
}
