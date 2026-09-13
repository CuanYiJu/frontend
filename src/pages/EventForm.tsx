import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ApiError, api, type EventKind } from '../api';
import { ErrorBanner, Field } from '../components/Field';
import { defaultStart, fromLocalInput, toLocalInput } from '../format';

interface FormState {
  kind: EventKind;
  title: string;
  games: string;
  location: string;
  startsAt: string; // datetime-local value
  durationMin: number;
  capacity: number;
  minSize: number;
  description: string;
  repeatWeeks: number;
}

const DURATIONS = [
  { value: 120, label: '2 小时' },
  { value: 180, label: '3 小时' },
  { value: 240, label: '4 小时' },
  { value: 300, label: '5 小时' },
  { value: 360, label: '6 小时' },
  { value: 480, label: '8 小时' },
];

export function EventFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState | null>(
    mode === 'create'
      ? { kind: 'adhoc', title: '', games: '', location: '', startsAt: defaultStart(), durationMin: 180, capacity: 5, minSize: 3, description: '', repeatWeeks: 4 }
      : null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== 'edit') return;
    api
      .getEvent(id)
      .then(({ event }) => {
        if (!event.isHost) {
          setError('只有组织者可以编辑。');
          return;
        }
        setForm({
          kind: event.kind,
          title: event.title,
          games: event.games ?? '',
          location: event.location,
          startsAt: toLocalInput(event.startsAt),
          durationMin: event.durationMin,
          capacity: event.capacity,
          minSize: event.minSize,
          description: event.description ?? '',
          repeatWeeks: 1,
        });
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : '加载失败。'));
  }, [mode, id]);

  if (!form) return error ? <ErrorBanner message={error} /> : <p className="muted center">加载中…</p>;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const common = {
        title: form.title.trim(),
        games: form.games.trim() || null,
        description: form.description.trim() || null,
        location: form.location.trim(),
        startsAt: fromLocalInput(form.startsAt),
        durationMin: form.durationMin,
        capacity: form.capacity,
        minSize: form.minSize,
      };
      if (mode === 'create') {
        const { events } = await api.createEvent({ ...common, kind: form.kind, repeatWeeks: form.kind === 'regular' ? form.repeatWeeks : 1 });
        const first = events[0];
        navigate(first ? `/events/${first.id}` : '/', { replace: true });
      } else {
        await api.updateEvent(id, common);
        navigate(`/events/${id}`, { replace: true });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '保存失败，请重试。');
      setBusy(false);
    }
  };

  const num = (v: string, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  return (
    <div className="card" style={{ marginTop: 8 }}>
      <h1>{mode === 'create' ? '发一个局' : '编辑局'}</h1>
      <ErrorBanner message={error} />
      <form onSubmit={submit}>
        {mode === 'create' ? (
          <>
            <div className="segmented" role="radiogroup">
              <button type="button" className={form.kind === 'adhoc' ? 'active' : ''} onClick={() => set('kind', 'adhoc')}>
                临时局 · 约一次
              </button>
              <button type="button" className={form.kind === 'regular' ? 'active' : ''} onClick={() => set('kind', 'regular')}>
                固定局 · 每周
              </button>
            </div>
            {form.kind === 'regular' ? (
              <Field label="连续几周" hint="每周同一时间各生成一个局，每个局单独报名；不需要的那周可以单独取消。">
                <select value={form.repeatWeeks} onChange={(e) => set('repeatWeeks', num(e.target.value, 4))}>
                  {[2, 3, 4, 6, 8, 12].map((n) => (
                    <option key={n} value={n}>
                      {n} 周
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
          </>
        ) : null}

        <Field label="标题" hint="2–40 个字，例如「周六下午重策局」「求人：三人卡坦」。">
          <input value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={40} required autoFocus={mode === 'create'} />
        </Field>
        <Field label="玩什么（可选）">
          <input value={form.games} onChange={(e) => set('games', e.target.value)} maxLength={100} placeholder="卡坦岛、璀璨宝石，或者「到了再定」" />
        </Field>
        <Field label="地点">
          <input value={form.location} onChange={(e) => set('location', e.target.value)} maxLength={100} placeholder="桌游吧名字 / 谁家 / 大概区域" required />
        </Field>
        <div className="field-row">
          <Field label={mode === 'create' && form.kind === 'regular' ? '第一次的开始时间' : '开始时间'}>
            <input type="datetime-local" value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)} required />
          </Field>
          <Field label="时长">
            <select value={form.durationMin} onChange={(e) => set('durationMin', num(e.target.value, 180))}>
              {DURATIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="field-row">
          <Field label="人数上限" hint="包括你自己。满了之后自动进候补。">
            <input type="number" min={2} max={200} value={form.capacity} onChange={(e) => set('capacity', num(e.target.value, 5))} required />
          </Field>
          <Field label="最少几人成局">
            <input type="number" min={2} max={200} value={form.minSize} onChange={(e) => set('minSize', num(e.target.value, 2))} required />
          </Field>
        </div>
        <Field label="说明（可选）" hint="新手友好？要带游戏？费用怎么算？都写这里。">
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)} maxLength={2000} />
        </Field>
        <div className="actions">
          <button type="button" className="btn secondary" onClick={() => navigate(-1)} disabled={busy}>
            取消
          </button>
          <button className="btn primary" disabled={busy}>
            {busy ? '保存中…' : mode === 'create' ? '发布' : '保存'}
          </button>
        </div>
      </form>
    </div>
  );
}
