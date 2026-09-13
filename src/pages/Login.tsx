import { useState, type FormEvent } from 'react';
import { Navigate, useSearchParams } from 'react-router';
import { ApiError, api } from '../api';
import { ErrorBanner, Field } from '../components/Field';
import { isWeChat } from '../format';
import { useSession } from '../session';

export function LoginPage() {
  const { loading, user, profile, refresh } = useSession();
  const [params] = useSearchParams();
  const next = params.get('next');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loading && user) return <Navigate to={profile ? (next ?? '/') : '/onboarding'} replace />;

  const send = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.requestLink(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '发送失败，请重试。');
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await api.verifyCode(email, code, next);
      await refresh();
      window.location.assign(result.redirectTo);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '登录失败，请重试。');
      setBusy(false);
    }
  };

  return (
    <div className="login-box card">
      <h1>登录</h1>
      <p className="muted">不用密码。输入邮箱，我们发一封带登录链接和 6 位码的邮件。</p>
      {isWeChat() ? <div className="banner info">在微信里打开的？收到邮件后回到这里输入 6 位码就行，不用跳出微信。</div> : null}
      <ErrorBanner message={error} />
      {!sent ? (
        <form onSubmit={send}>
          <Field label="邮箱">
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              required
              autoFocus
            />
          </Field>
          <button className="btn primary block" disabled={busy || !email}>
            {busy ? '发送中…' : '发送登录邮件'}
          </button>
        </form>
      ) : (
        <form onSubmit={verify}>
          <div className="banner ok">
            邮件已发到 <strong>{email}</strong>。点邮件里的链接，或在这里输入邮件里的 6 位码（15 分钟内有效）。
          </div>
          <Field label="6 位验证码">
            <input
              className="code-input"
              name="code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              placeholder="······"
              required
              autoFocus
            />
          </Field>
          <button className="btn primary block" disabled={busy || code.length !== 6}>
            {busy ? '登录中…' : '登录'}
          </button>
          <p className="small muted center" style={{ marginTop: 12 }}>
            没收到？看看垃圾邮件，或{' '}
            <button type="button" className="btn icon" style={{ fontSize: 14, color: 'var(--accent-text)' }} onClick={() => setSent(false)}>
              重新发送
            </button>
          </p>
        </form>
      )}
    </div>
  );
}
