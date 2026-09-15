import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, api, type ApprovalRequest, type InviteName } from '../api';
import { ErrorBanner, Field } from '../components/Field';
import { formatDate } from '../format';
import { useSession } from '../session';

export function AdminPage() {
  const { refresh } = useSession();
  const [names, setNames] = useState<InviteName[] | null>(null);
  const [requests, setRequests] = useState<ApprovalRequest[] | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    try {
      const [n, r] = await Promise.all([api.listInviteNames(), api.listRequests()]);
      setNames(n.names);
      setRequests(r.requests);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '加载失败。');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const act = async <T,>(fn: () => Promise<T>, done: string | ((result: T) => string)) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await fn();
      setNotice(typeof done === 'function' ? done(result) : done);
      await load();
      await refresh(); // nav badge
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '操作失败。');
    } finally {
      setBusy(false);
    }
  };

  const add = async (e: FormEvent) => {
    e.preventDefault();
    const names = text;
    await act(
      async () => {
        const r = await api.addInviteNames(names);
        setText('');
        return r;
      },
      (r) => `加了 ${r.added.length} 个${r.duplicates.length ? `，${r.duplicates.length} 个已经在名单里：${r.duplicates.join('、')}` : '。'}`,
    );
  };

  const remove = (n: InviteName) => {
    if (!window.confirm(`把「${n.name}」从名单里去掉？`)) return;
    void act(() => api.removeInviteName(n.id), `已去掉 ${n.name}。`);
  };

  const approve = (r: ApprovalRequest) => void act(() => api.approveRequest(r.userId), `已通过 ${r.wechatName}。`);
  const reject = (r: ApprovalRequest) => {
    const note = window.prompt(`拒绝「${r.wechatName}」的申请？可以写一句原因，对方会看到（可留空）：`);
    if (note === null) return;
    void act(() => api.rejectRequest(r.userId, note.trim() || null), `已拒绝 ${r.wechatName}。`);
  };

  const unclaimed = names?.filter((n) => !n.claimedBy) ?? [];
  const claimed = names?.filter((n) => n.claimedBy) ?? [];

  return (
    <>
      <h1>成员名单</h1>
      <ErrorBanner message={error} />
      {notice ? <div className="banner ok">{notice}</div> : null}

      {requests && requests.length > 0 ? (
        <>
          <h2>
            待审核 <span className="muted">{requests.length}</span>
          </h2>
          <p className="muted small">这些人填的微信名不在名单里。对照群成员列表确认是群里的人再通过。</p>
          <div className="card">
            <ul className="people">
              {requests.map((r) => (
                <li key={r.userId}>
                  <span className="name">
                    {r.wechatName}
                    <span className="wx">
                      站内昵称：{r.nickname} · {r.email} · {formatDate(r.requestedAt)}
                    </span>
                  </span>
                  <button className="btn primary small" disabled={busy} onClick={() => approve(r)}>
                    通过
                  </button>
                  <button className="btn danger small" disabled={busy} onClick={() => reject(r)}>
                    拒绝
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : null}

      <h2>加名字</h2>
      <p className="muted small">
        把群成员的微信名（微信昵称，不是群昵称）贴进来，一行一个，或用逗号分开。新人填的微信名和这里对上就直接进；对不上会出现在上面的待审核里。
      </p>
      <div className="card">
        <form onSubmit={add}>
          <Field label="微信名">
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={'小明 🎲\n阿花\n老王'} rows={5} />
          </Field>
          <button className="btn primary block" disabled={busy || !text.trim()}>
            {busy ? '保存中…' : '加入名单'}
          </button>
        </form>
      </div>

      {names === null && !error ? <p className="muted center">加载中…</p> : null}

      <h2>
        还没用的 <span className="muted">{unclaimed.length}</span>
      </h2>
      <div className="card">
        {unclaimed.length === 0 ? <p className="muted small" style={{ margin: 0 }}>没有。</p> : null}
        <ul className="people">
          {unclaimed.map((n) => (
            <li key={n.id}>
              <span className="name">
                {n.name}
                <span className="wx">加于 {formatDate(n.createdAt)}</span>
              </span>
              <button className="btn icon" title="去掉" aria-label="去掉" disabled={busy} onClick={() => remove(n)}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      </div>

      <h2>
        已注册 <span className="muted">{claimed.length}</span>
      </h2>
      <div className="card">
        {claimed.length === 0 ? <p className="muted small" style={{ margin: 0 }}>还没有人注册。</p> : null}
        <ul className="people">
          {claimed.map((n) => (
            <li key={n.id}>
              <span className="name">
                {n.name}
                <span className="wx">站内昵称：{n.claimedBy?.nickname}</span>
              </span>
              <span className="badge confirmed">已注册</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
