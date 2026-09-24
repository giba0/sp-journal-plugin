import JSZip from 'jszip';
import { buildArchive } from '../src/export';
import { DayStore } from '../src/day-store';
import type { DayId, DayRecord, JournalStorage } from '../src/types';

class ExportStorage implements JournalStorage {
  constructor(private readonly values: Record<string, string>) {}
  async read(day: DayId): Promise<DayRecord | null> {
    const markdown = this.values[day];
    return markdown === undefined ? null : {
      schemaVersion: 1,
      day,
      markdown,
      updatedAt: '2026-09-24T20:15:00.000Z',
      writerId: 'export-test',
      revisionId: day,
      parentRevisionId: null,
    };
  }
  async write(): Promise<void> { return undefined; }
  subscribeChanges(): () => void { return () => undefined; }
}

describe('export', () => {
  it('keeps Markdown bytes/text and predictable names in a range ZIP', async () => {
    const store = new DayStore(new ExportStorage({
      '2026-09-24': '# Café\n日本語\n',
      '2026-09-23': '',
    }));
    const blob = await buildArchive(store, ['2026-09-23', '2026-09-24']);
    const zip = await JSZip.loadAsync(blob);
    expect(Object.keys(zip.files)).toEqual(['2026-09-24.md']);
    expect(await zip.file('2026-09-24.md')?.async('string')).toBe('# Café\n日本語\n');
  });
});
