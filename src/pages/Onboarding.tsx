import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { ApiError, api } from '../api';
import { ErrorBanner, Field } from '../components/Field';
import { useSession } from '../session';

export function OnboardingPage() {
  const { user, profile, isAdmin, setProfile, refresh, logout } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') ?? '/';
  const [editing, setEditing] = useState(false);
  const [wechatName, setWechatName] = useState(profile?.wechatName ?? '');
  const [nickname, setNickname] = useState(profile?.nickname ?? '');
  const [greeting, setGreeting] = useState(profile?.greeting ?? '');
  const [nicknameTouched, setNicknameTouched] = useState(!!profile);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (profile?.status === 'active') return <Navigate to={next} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { profile: saved } = await api.saveProfile({ nickname: nickname.trim(), wechatName: wechatName.trim(), greeting: greeting.trim() || null });
      setProfile(saved);
      setEditing(false);
      if (saved.status === 'active') navigate(next, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '保存失败，请重试。');
    } finally {
      setBusy(false);
    }
  };

  const check = async () => {
    setBusy(true);
    try {
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  // Waiting for, turned down by, or removed by the admin.
  if (profile && !editing) {
    const pending = profile.status === 'pending';
    const removed = profile.status === 'removed';
    return (
      <div className="card" style={{ marginTop: 24 }}>
        <h1>{pending ? '等群主审核' : removed ? '你已被移出' : '申请没有通过'}</h1>
        {pending ? (
          <>
            <div className="banner info">已经把你的申请交给群主了。通过后就能进来，可以在群里提醒群主一下。</div>
            <p className="muted small">
              微信名：<strong>{profile.wechatName}</strong>，站内昵称：<strong>{profile.nickname}</strong>
            </p>
            {profile.greeting ? <p className="muted small">你的招呼：{profile.greeting}</p> : null}
          </>
        ) : removed ? (
          <div className="banner warn">群主把你移出了{profile.reviewNote ? `：${profile.reviewNote}` : '。'}如果是误会，可以重新打个招呼申请。</div>
        ) : (
          <div className="banner warn">群主没有通过{profile.reviewNote ? `：${profile.reviewNote}` : '。'}可以改一下再重新申请。</div>
        )}
        <div className="actions">
          {pending ? (
            <button className="btn primary" disabled={busy} onClick={() => void check()}>
              {busy ? '查看中…' : '通过了吗？刷新看看'}
            </button>
          ) : null}
          <button className="btn secondary" onClick={() => setEditing(true)}>
            {pending ? '改一下重新提交' : '重新申请'}
          </button>
        </div>
        <p className="center">
          <button
            className="btn icon"
            style={{ fontSize: 14 }}
            onClick={async () => {
              await logout();
              navigate('/login', { replace: true });
            }}
          >
            退出登录
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <h1>{isAdmin ? '完善资料' : '打个招呼'}</h1>
      <p className="muted">
        已登录 <strong>{user?.email}</strong>。
        {isAdmin ? '你是群主，填好就能进。' : '这个站只对群里的朋友开放：填一下你是谁，群主看过就放你进来。'}
      </p>
      <ErrorBanner message={error} />
      <form onSubmit={submit}>
        <Field label="微信名" hint="微信「我」页面顶部显示的名字（微信昵称），方便群主对上号。">
          <input
            value={wechatName}
            onChange={(e) => {
              setWechatName(e.target.value);
              if (!nicknameTouched) setNickname(e.target.value.trim().slice(0, 20));
            }}
            maxLength={40}
            required
            autoFocus
          />
        </Field>
        <Field label="站内昵称" hint="2–20 个字，报名后大家看到的名字。默认和微信名一样，可以改。">
          <input
            value={nickname}
            onChange={(e) => {
              setNicknameTouched(true);
              setNickname(e.target.value);
            }}
            minLength={2}
            maxLength={20}
            required
          />
        </Field>
        <Field label={isAdmin ? '打个招呼（可选）' : '打个招呼'} hint="一两句就行：你是群里的谁、常玩什么，让群主认得出你。">
          <textarea value={greeting} onChange={(e) => setGreeting(e.target.value)} maxLength={300} required={!isAdmin} placeholder="我是群里的小明，常玩德式，周末有空。" />
        </Field>
        <div className="actions" style={{ margin: 0 }}>
          {profile ? (
            <button type="button" className="btn secondary" onClick={() => setEditing(false)} disabled={busy}>
              返回
            </button>
          ) : null}
          <button className="btn primary" disabled={busy}>
            {busy ? '提交中…' : isAdmin ? '进入桌游群' : profile ? '重新提交' : '提交申请'}
          </button>
        </div>
      </form>
    </div>
  );
}
