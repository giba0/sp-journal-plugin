import { addDays, dayIdFromDate, enumerateDays, parseDayId } from '../src/date';

describe('civil dates', () => {
  it('does not use UTC when deriving a day id', () => {
    const date = new Date(2026, 8, 24, 23, 59);
    expect(dayIdFromDate(date)).toBe('2026-09-24');
  });

  it('crosses month, leap year and year boundaries', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2024-02-29', 1)).toBe('2024-03-01');
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('validates impossible civil dates', () => {
    expect(() => parseDayId('2026-02-30')).toThrow();
    expect(enumerateDays('2026-02-27', '2026-03-01')).toEqual([
      '2026-02-27', '2026-02-28', '2026-03-01',
    ]);
  });
});
