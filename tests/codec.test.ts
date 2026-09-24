import { decodeDayRecord, encodeDayRecord } from '../src/codec';

const record = {
  schemaVersion: 1 as const,
  day: '2026-09-24' as const,
  markdown: '# Olá\n- preservado\n',
  updatedAt: '2026-09-24T20:15:00.000Z',
  writerId: 'device-a',
  revisionId: 'revision-a',
  parentRevisionId: null,
};

describe('day record codec', () => {
  it('serializes a canonical stable field order and round trips', () => {
    const encoded = encodeDayRecord(record);
    expect(encoded).toBe(JSON.stringify(record));
    expect(decodeDayRecord(encoded, record.day)).toEqual(record);
  });

  it('rejects malformed, unsupported and mismatched data', () => {
    expect(() => decodeDayRecord('{')).toThrow();
    expect(() => decodeDayRecord(JSON.stringify({ ...record, schemaVersion: 2 }))).toThrow();
    expect(() => decodeDayRecord(JSON.stringify({ ...record, day: '2026-09-25' }), record.day)).toThrow();
    expect(() => decodeDayRecord(JSON.stringify({ ...record, markdown: 3 }))).toThrow();
  });
});
