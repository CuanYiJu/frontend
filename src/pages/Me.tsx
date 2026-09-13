import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { ApiError, api, type EventSummary } from '../api';
import { EventCard } from '../components/EventCard';
import { ErrorBanner, Field } from '../components/Field';
import { useSession } from '../session';

export function MePage() {
  const { user, profile, setProfile, logout } = useSession();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState(profile?.nickname ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<EventSummary[] | null>(null);

  useEffect(() => {
    api
      .listEvents('mine')
      .then((r) => setEvents(r.events))
      .catch(() => setEvents([]));
  }, []);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { profile: saved } = await api.saveProfile({ nickname, bio: bio || null });
      setProfile(saved);
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '保存失败。');
    } finally {
      setBusy(false);
    }
  };

  const upcoming = events?.filter((e) => !e.isPast) ?? [];

  return (
    <>
      <div className="card">
        {!editing ? (
          <>
            <div className="row between">
              <div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{profile?.nickname}</div>
                <div className="muted small">
                  {profile?.wechatName ? `微信：${profile.wechatName} · ` : ''}
                  {user?.email}
                </div>
              </div>
              <button className="btn secondary small" onClick={() => setEditing(true)}>
                编辑
              </button>
            </div>
            {profile?.bio ? <p className="description" style={{ marginBottom: 0 }}>{profile.bio}</p> : null}
          </>
        ) : (
          <form onSubmit={save}>
            <ErrorBanner message={error} />
            <Field label="昵称">
              <input value={nickname} onChange={(e) => setNickname(e.target.value)} minLength={2} maxLength={20} required />
            </Field>
            <p className="muted small">微信名：{profile?.wechatName}（注册时对过名单，不能改）</p>
            <Field label="一句话介绍（可选）">
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={200} placeholder="喜欢什么类型？新手还是老手？" />
            </Field>
            <div className="actions" style={{ margin: 0 }}>
              <button type="button" className="btn secondary" onClick={() => setEditing(false)} disabled={busy}>
                取消
              </button>
              <button className="btn primary" disabled={busy}>
                保存
              </button>
            </div>
          </form>
        )}
      </div>

      <h2>我接下来的局</h2>
      {events === null ? <p className="muted center">加载中…</p> : null}
      {events !== null && upcoming.length === 0 ? <p className="empty">还没有。去首页看看有什么局，或者自己发一个。</p> : null}
      <div className="stack">
        {upcoming.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
      </div>

      <p className="center" style={{ marginTop: 32 }}>
        <button
          className="btn secondary small"
          onClick={async () => {
            await logout();
            navigate('/login', { replace: true });
          }}
        >
          退出登录
        </button>
      </p>
    </>
  );
}
