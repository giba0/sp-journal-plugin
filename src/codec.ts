import type { DayId, DayRecord } from './types';
import { parseDayId } from './date';

export function encodeDayRecord(record: DayRecord): string {
  return JSON.stringify({
    schemaVersion: 1,
    day: record.day,
    markdown: record.markdown,
    updatedAt: record.updatedAt,
    writerId: record.writerId,
    revisionId: record.revisionId,
    parentRevisionId: record.parentRevisionId,
  });
}

export function decodeDayRecord(raw: string, expectedDay?: DayId): DayRecord {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error('Journal data is not valid JSON');
  }
  if (!isRecord(value)) throw new Error('Journal data has an invalid shape');
  if (value.schemaVersion !== 1 || typeof value.day !== 'string') {
    throw new Error('Unsupported journal data version');
  }
  parseDayId(value.day);
  if (expectedDay && value.day !== expectedDay) {
    throw new Error('Journal key does not match the stored day');
  }
  if (
    typeof value.markdown !== 'string' ||
    typeof value.updatedAt !== 'string' ||
    typeof value.writerId !== 'string' ||
    typeof value.revisionId !== 'string' ||
    (value.parentRevisionId !== null && typeof value.parentRevisionId !== 'string')
  ) {
    throw new Error('Journal data has invalid fields');
  }
  if (Number.isNaN(Date.parse(value.updatedAt))) {
    throw new Error('Journal data has an invalid updatedAt');
  }
  return {
    schemaVersion: 1,
    day: value.day as DayId,
    markdown: value.markdown,
    updatedAt: value.updatedAt,
    writerId: value.writerId,
    revisionId: value.revisionId,
    parentRevisionId: value.parentRevisionId,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
