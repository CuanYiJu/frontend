import { describe, expect, test } from 'vitest';
import { defaultStart, formatDate, formatDuration, formatTimeRange, fromLocalInput, relativeDay, toLocalInput } from './format';

const at = (y: number, m: number, d: number, h = 14, min = 0) => new Date(y, m - 1, d, h, min).toISOString();
const daysFromNow = (n: number) => {
  const t = new Date();
  t.setDate(t.getDate() + n);
  t.setHours(15, 30, 0, 0);
  return t.toISOString();
};

describe('formatDate', () => {
  test('this year: month, day and weekday with 周, no year', () => {
    const y = new Date().getFullYear();
    expect(formatDate(at(y, 9, 13))).toMatch(/^9月13日\s?周[一二三四五六日]$/);
    expect(formatDate(at(y, 9, 13))).not.toContain(String(y));
  });

  test('another year includes the year', () => {
    expect(formatDate(at(2031, 1, 2))).toMatch(/^2031年1月2日\s?周[一二三四五六日]$/);
  });
});

describe('formatTimeRange', () => {
  test('24h start–end', () => {
    const y = new Date().getFullYear();
    expect(formatTimeRange(at(y, 9, 13, 14, 0), at(y, 9, 13, 17, 30))).toBe('14:00–17:30');
  });
});

describe('relativeDay', () => {
  test('today / tomorrow / day after / nothing', () => {
    expect(relativeDay(daysFromNow(0))).toBe('今天');
    expect(relativeDay(daysFromNow(1))).toBe('明天');
    expect(relativeDay(daysFromNow(2))).toBe('后天');
    expect(relativeDay(daysFromNow(3))).toBe('');
    expect(relativeDay(daysFromNow(-1))).toBe('');
  });

  test('late tonight is still 今天 (compares calendar days, not 24h windows)', () => {
    const t = new Date();
    t.setHours(23, 59, 0, 0);
    expect(relativeDay(t.toISOString())).toBe('今天');
  });
});

describe('formatDuration', () => {
  test('whole hours and mixed', () => {
    expect(formatDuration(120)).toBe('2 小时');
    expect(formatDuration(150)).toBe('2 小时 30 分');
    expect(formatDuration(45)).toBe('0 小时 45 分');
  });
});

describe('datetime-local round trip', () => {
  test('ISO → input value → ISO keeps the minute', () => {
    const y = new Date().getFullYear();
    const iso = at(y, 9, 13, 9, 5);
    expect(toLocalInput(iso)).toBe(`${y}-09-13T09:05`);
    expect(fromLocalInput(toLocalInput(iso))).toBe(iso);
  });
});

describe('defaultStart', () => {
  test('next Saturday at 14:00, in the future', () => {
    const value = defaultStart();
    const d = new Date(value);
    expect(d.getDay()).toBe(6);
    expect(d.getHours()).toBe(14);
    expect(d.getMinutes()).toBe(0);
    expect(d.getTime()).toBeGreaterThan(Date.now());
    expect(d.getTime() - Date.now()).toBeLessThanOrEqual(7 * 86_400_000);
  });
});
