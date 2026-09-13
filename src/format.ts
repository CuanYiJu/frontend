/**
 * All times display in the browser's own timezone. The group is in one
 * city, so this matches what everyone expects without a timezone picker.
 */

const dateFmt = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });
const timeFmt = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
const yearFmt = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });

function isThisYear(d: Date): boolean {
  return d.getFullYear() === new Date().getFullYear();
}

/** "9月13日 周六" (year added when it is not this year). */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return (isThisYear(d) ? dateFmt : yearFmt).format(d).replace(/星期/, '周');
}

/** "14:00–17:00" */
export function formatTimeRange(startIso: string, endIso: string): string {
  return `${timeFmt.format(new Date(startIso))}–${timeFmt.format(new Date(endIso))}`;
}

/** "今天" / "明天" / "后天" or empty. */
export function relativeDay(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return '今天';
  if (diff === 1) return '明天';
  if (diff === 2) return '后天';
  return '';
}

export function formatDuration(min: number): string {
  if (min % 60 === 0) return `${min / 60} 小时`;
  return `${Math.floor(min / 60)} 小时 ${min % 60} 分`;
}

/** ISO → value for <input type="datetime-local"> in local time. */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** <input type="datetime-local"> value (local time) → ISO UTC. */
export function fromLocalInput(value: string): string {
  return new Date(value).toISOString();
}

/** Next Saturday 14:00 local, as a sensible default for a new 局. */
export function defaultStart(): string {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
  d.setHours(14, 0, 0, 0);
  return toLocalInput(d.toISOString());
}

export function isWeChat(): boolean {
  return /MicroMessenger/i.test(navigator.userAgent);
}
