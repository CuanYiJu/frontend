import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, api, type ApprovalRequest, type Member } from '../api';
import { ErrorBanner, Field } from '../components/Field';
import { AdminModeToggle } from '../components/AdminModeToggle';
import { formatDate } from '../format';
import { useSession } from '../session';

export function AdminPage() {
  const { refresh } = useSession();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [requests, setRequests] = useState<ApprovalRequest[] | null>(null);
  const [member, setMember] = useState({ email: '', wechatName: '', nickname: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    try {
      const [m, r] = await Promise.all([api.listMembers(), api.listRequests()]);
      setMembers(m.members);
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

  const addDirect = async (e: FormEvent) => {
    e.preventDefault();
    const input = { email: member.email.trim(), wechatName: member.wechatName.trim(), nickname: member.nickname.trim() || null };
    await act(
      async () => {
        const r = await api.addMember(input);
        setMember({ email: '', wechatName: '', nickname: '' });
        return r;
      },
      (r) => `已加入 ${r.profile.nickname}（${r.email}）。用这个邮箱登录就能直接进来。`,
    );
  };

  const approve = (r: ApprovalRequest) => void act(() => api.approveRequest(r.userId), `已通过 ${r.wechatName}。`);
  const reject = (r: ApprovalRequest) => {
    const note = window.prompt(`拒绝「${r.wechatName}」的申请？可以写一句原因，对方会看到（可留空）：`);
    if (note === null) return;
    void act(() => api.rejectRequest(r.userId, note.trim() || null), `已拒绝 ${r.wechatName}。`);
  };
  const remove = (m: Member) => {
    const note = window.prompt(`把「${m.nickname}」移出？对方会退出所有还没开始的局，组织的局会被取消。可以写一句原因，对方会看到（可留空）：`);
    if (note === null) return;
    void act(
      () => api.removeMember(m.userId, note.trim() || null),
      (r) => `已移出 ${m.nickname}${r.cancelledEvents || r.withdrawnFrom ? `（取消了 ${r.cancelledEvents} 个局，退出了 ${r.withdrawnFrom} 个局）` : ''}。`,
    );
  };

  return (
    <>
      <h1>成员管理</h1>
      <ErrorBanner message={error} />
      {notice ? <div className="banner ok">{notice}</div> : null}

      {requests && requests.length > 0 ? (
        <>
          <h2>
            待审核 <span className="muted">{requests.length}</span>
          </h2>
          <p className="muted small">看看招呼和微信名，确认是群里的人再通过。</p>
          <div className="card">
            <ul className="people">
              {requests.map((r) => (
                <li key={r.userId} style={{ alignItems: 'flex-start' }}>
                  <span className="name">
                    {r.wechatName}
                    <span className="wx">
                      站内昵称：{r.nickname} · {r.email} · {formatDate(r.requestedAt)}
                    </span>
                    {r.greeting ? <div className="greeting">“{r.greeting}”</div> : null}
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

      <h2>群主模式</h2>
      <div className="card">
        <AdminModeToggle />
      </div>

      <h2>直接加人</h2>
      <p className="muted small">知道对方邮箱的话，直接加成成员：对方用这个邮箱登录就进来了，不用打招呼，也不用审核。</p>
      <div className="card">
        <form onSubmit={addDirect}>
          <Field label="邮箱">
            <input type="email" value={member.email} onChange={(e) => setMember({ ...member, email: e.target.value })} inputMode="email" autoComplete="off" required />
          </Field>
          <Field label="对方的微信名">
            <input value={member.wechatName} onChange={(e) => setMember({ ...member, wechatName: e.target.value })} maxLength={40} required />
          </Field>
          <Field label="站内昵称（可选）" hint="不填就用微信名。">
            <input value={member.nickname} onChange={(e) => setMember({ ...member, nickname: e.target.value })} maxLength={20} />
          </Field>
          <button className="btn primary block" disabled={busy || !member.email.trim() || !member.wechatName.trim()}>
            {busy ? '保存中…' : '加为成员'}
          </button>
        </form>
      </div>

      <h2>
        成员 <span className="muted">{members?.length ?? ''}</span>
      </h2>
      {members === null && !error ? <p className="muted center">加载中…</p> : null}
      <div className="card">
        {members && members.length === 0 ? <p className="muted small" style={{ margin: 0 }}>还没有成员。</p> : null}
        <ul className="people">
          {(members ?? []).map((m) => (
            <li key={m.userId}>
              <span className="name">
                {m.nickname}
                {m.isAdmin ? <span className="badge host">群主</span> : null}
                <span className="wx">
                  微信：{m.wechatName} · {m.email} · {formatDate(m.joinedAt)} 加入
                </span>
              </span>
              {!m.isAdmin ? (
                <button className="btn danger small" disabled={busy} onClick={() => remove(m)}>
                  移出
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
