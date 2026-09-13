import { Link } from 'react-router';
import type { EventSummary } from '../api';
import { formatDate, formatTimeRange, relativeDay } from '../format';

export function KindBadge({ kind }: { kind: EventSummary['kind'] }) {
  return <span className={`badge ${kind}`}>{kind === 'regular' ? '固定局' : '临时局'}</span>;
}

export function StatusBadge({ event }: { event: EventSummary }) {
  if (event.status === 'cancelled') return <span className="badge cancelled">已取消</span>;
  if (event.isPast) return <span className="badge past">已结束</span>;
  if (event.isHost) return <span className="badge host">我组的</span>;
  if (event.myStatus === 'confirmed') return <span className="badge confirmed">已报名</span>;
  if (event.myStatus === 'waitlisted') return <span className="badge waitlisted">候补中</span>;
  if (event.confirmedCount >= event.capacity) return <span className="badge full">已满员</span>;
  return null;
}

export function Seats({ event }: { event: EventSummary }) {
  const full = event.confirmedCount >= event.capacity;
  return (
    <span className={`seats${full ? ' full' : ''}`}>
      {event.confirmedCount}/{event.capacity} 人{event.waitlistCount > 0 ? ` · 候补 ${event.waitlistCount}` : ''}
    </span>
  );
}

export function EventCard({ event }: { event: EventSummary }) {
  const rel = relativeDay(event.startsAt);
  return (
    <Link to={`/events/${event.id}`} className={`event-card${event.isPast ? ' dim' : ''}`}>
      <div className="row between">
        <span className="when">
          {rel ? `${rel} · ` : ''}
          {formatDate(event.startsAt)} {formatTimeRange(event.startsAt, event.endsAt)}
        </span>
        <StatusBadge event={event} />
      </div>
      <div className="title">{event.title}</div>
      <div className="meta">
        <span>📍 {event.location}</span>
        {event.games ? <span>🎲 {event.games}</span> : null}
      </div>
      <div className="foot">
        <span className="row">
          <KindBadge kind={event.kind} />
          <span className="muted">{event.host.nickname} 组局</span>
        </span>
        <Seats event={event} />
      </div>
    </Link>
  );
}
