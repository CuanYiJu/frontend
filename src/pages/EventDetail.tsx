import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ApiError, api, type EventDetail } from '../api';
import { KindBadge, Seats, StatusBadge } from '../components/EventCard';
import { ErrorBanner } from '../components/Field';
import { formatDate, formatDuration, formatTimeRange, relativeDay } from '../format';

export function EventDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setEvent((await api.getEvent(id)).event);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '加载失败。');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async <T extends { event: EventDetail }>(fn: () => Promise<T>, done?: (r: T) => string | null) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await fn();
      setEvent(result.event);
      if (done) setNotice(done(result));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '操作失败，请重试。');
      await load();
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    const url = window.location.href;
    const text = event ? `【${event.title}】${formatDate(event.startsAt)} ${formatTimeRange(event.startsAt, event.endsAt)} · ${event.location}\n报名：${url}` : url;
    try {
      await navigator.clipboard.writeText(text);
      setNotice('已复制，去群里发一下吧。');
    } catch {
      setNotice(`复制失败，请手动复制：${url}`);
    }
  };

  const cancel = async () => {
    const reason = window.prompt('确定取消这个局？可以写一句原因（可留空）：');
    if (reason === null) return;
    await run(() => api.cancelEvent(id, reason.trim() || null).then(async () => ({ event: (await api.getEvent(id)).event })), () => '已取消。');
  };

  if (error && !event) return <ErrorBanner message={error} />;
  if (!event) return <p className="muted center">加载中…</p>;

  const full = event.confirmedCount >= event.capacity;
  const joined = event.myStatus === 'confirmed' || event.myStatus === 'waitlisted';
  const confirmed = event.participants.filter((p) => p.status === 'confirmed');
  const waitlist = event.participants.filter((p) => p.status === 'waitlisted');
  const rel = relativeDay(event.startsAt);

  return (
    <>
      <div className="card">
        <div className="row between wrap">
          <span className="row">
            <KindBadge kind={event.kind} />
            {event.seriesId ? <span className="small muted">每周</span> : null}
          </span>
          <StatusBadge event={event} />
        </div>
        <h1 style={{ margin: '10px 0 4px' }}>{event.title}</h1>
        <div className="muted">{event.host.nickname} 组局</div>

        {event.status === 'cancelled' ? (
          <div className="banner warn">这个局已取消{event.cancelReason ? `：${event.cancelReason}` : '。'}</div>
        ) : event.isPast ? (
          <div className="banner info">这个局已经结束了。</div>
        ) : null}

        <dl className="facts">
          <dt>时间</dt>
          <dd>
            {rel ? `${rel} · ` : ''}
            {formatDate(event.startsAt)} {formatTimeRange(event.startsAt, event.endsAt)}
            <span className="muted small">（{formatDuration(event.durationMin)}）</span>
          </dd>
          <dt>地点</dt>
          <dd>{event.location}</dd>
          {event.games ? (
            <>
              <dt>玩什么</dt>
              <dd>{event.games}</dd>
            </>
          ) : null}
          <dt>人数</dt>
          <dd>
            <Seats event={event} />
            <span className="muted small">，{event.minSize} 人成局</span>
          </dd>
        </dl>
        {event.description ? <p className="description">{event.description}</p> : null}

        <ErrorBanner message={error} />
        {notice ? <div className="banner ok">{notice}</div> : null}

        {!event.isPast ? (
          <div className="actions">
            {joined ? (
              <button
                className="btn danger"
                disabled={busy}
                onClick={() => {
                  if (!window.confirm(event.myStatus === 'confirmed' ? '确定退出？名额会让给候补的人。' : '确定退出候补？')) return;
                  void run(() => api.leave(id), () => '已退出。');
                }}
              >
                {event.myStatus === 'confirmed' ? '退出报名' : '退出候补'}
              </button>
            ) : (
              <button
                className="btn primary"
                disabled={busy}
                onClick={() => void run(() => api.join(id), (r) => (r.status === 'confirmed' ? '报名成功，到时见！' : '已进入候补，有人退出会自动递补。'))}
              >
                {full ? '加入候补' : '报名'}
              </button>
            )}
            <button className="btn secondary" onClick={share}>
              复制分享
            </button>
          </div>
        ) : (
          <div className="actions">
            <button className="btn secondary" onClick={share}>
              复制分享
            </button>
          </div>
        )}

        {event.isHost && event.status === 'open' ? (
          <div className="row" style={{ gap: 10 }}>
            <Link to={`/events/${id}/edit`} className="btn secondary small">
              编辑
            </Link>
            <button className="btn danger small" disabled={busy} onClick={() => void cancel()}>
              取消这个局
            </button>
          </div>
        ) : null}
      </div>

      <h2>
        已报名 <span className="muted">{confirmed.length}/{event.capacity}</span>
      </h2>
      <div className="card">
        <ul className="people">
          {confirmed.map((p, i) => (
            <li key={p.userId}>
              <span className="num">{i + 1}.</span>
              <span className="name">
                {p.nickname}
                {p.userId === event.host.id ? <span className="badge host">组织者</span> : null}
                <span className="wx">微信：{p.wechatName}</span>
              </span>
              {event.isHost && p.userId !== event.host.id && event.status === 'open' ? (
                <button
                  className="btn icon"
                  title="移出名单"
                  aria-label="移出名单"
                  disabled={busy}
                  onClick={() => {
                    if (!window.confirm(`把 ${p.nickname} 移出名单？`)) return;
                    void run(() => api.removeParticipant(id, p.userId), () => `已移出 ${p.nickname}。`);
                  }}
                >
                  ✕
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      {waitlist.length > 0 ? (
        <>
          <h2>
            候补 <span className="muted">{waitlist.length}</span>
          </h2>
          <div className="card">
            <ul className="people">
              {waitlist.map((p, i) => (
                <li key={p.userId}>
                  <span className="num">{i + 1}.</span>
                  <span className="name">
                    {p.nickname}
                    <span className="wx">微信：{p.wechatName}</span>
                  </span>
                  {event.isHost && event.status === 'open' ? (
                    <button
                      className="btn icon"
                      title="移出候补"
                      aria-label="移出候补"
                      disabled={busy}
                      onClick={() => {
                        if (!window.confirm(`把 ${p.nickname} 移出候补？`)) return;
                        void run(() => api.removeParticipant(id, p.userId), () => `已移出 ${p.nickname}。`);
                      }}
                    >
                      ✕
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : null}

      <p className="center" style={{ marginTop: 24 }}>
        <button className="btn secondary small" onClick={() => navigate(-1)}>
          返回
        </button>
      </p>
    </>
  );
}
