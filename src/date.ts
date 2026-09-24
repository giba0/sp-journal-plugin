import type { DayId } from './types';

const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function dayIdFromDate(date: Date): DayId {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}` as DayId;
}

export function todayId(): DayId {
  return dayIdFromDate(new Date());
}

export function parseDayId(day: DayId | string): { year: number; month: number; day: number } {
  const match = DAY_PATTERN.exec(day);
  if (!match) throw new Error(`Invalid civil date: ${day}`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const dayNumber = Number(match[3]);
  const value = new Date(year, month - 1, dayNumber);
  if (
    value.getFullYear() !== year ||
    value.getMonth() !== month - 1 ||
    value.getDate() !== dayNumber
  ) {
    throw new Error(`Invalid civil date: ${day}`);
  }
  return { year, month, day: dayNumber };
}

export function addDays(day: DayId, amount: number): DayId {
  const parts = parseDayId(day);
  const value = new Date(parts.year, parts.month - 1, parts.day);
  value.setDate(value.getDate() + amount);
  return dayIdFromDate(value);
}

export function daysBetween(older: DayId, newer: DayId): number {
  let cursor = older;
  let count = 0;
  while (cursor !== newer && count < 100000) {
    cursor = addDays(cursor, 1);
    count += 1;
  }
  if (cursor !== newer) throw new Error('Invalid date interval');
  return count;
}

export function enumerateDays(from: DayId, to: DayId): DayId[] {
  const result: DayId[] = [];
  let cursor = from;
  while (true) {
    result.push(cursor);
    if (cursor === to) return result;
    cursor = addDays(cursor, 1);
    if (result.length > 100000) throw new Error('Intervalo demasiado grande');
  }
}

export function formatDay(day: DayId, locale = 'en-GB'): string {
  const { year, month, day: dayNumber } = parseDayId(day);
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, dayNumber));
}
