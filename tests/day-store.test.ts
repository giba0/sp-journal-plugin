import { DayStore } from '../src/day-store';
import type { DayId, DayRecord, JournalStorage } from '../src/types';

class FakeStorage implements JournalStorage {
  data = new Map<DayId, DayRecord>();
  listeners = new Set<() => void>();
  writes: DayRecord[] = [];
  failWrites = false;
  async read(day: DayId): Promise<DayRecord | null> { return this.data.get(day) ?? null; }
  async write(day: DayId, record: DayRecord): Promise<void> {
    if (this.failWrites) throw new Error('quota');
    this.data.set(day, record); this.writes.push(record); this.listeners.forEach((listener) => listener());
  }
  subscribeChanges(listener: () => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
}

describe('day store', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('debounces and serializes the latest generation', async () => {
    const storage = new FakeStorage();
    const store = new DayStore(storage, { debounceMs: 600, writerId: 'test' });
    const day = '2026-09-24' as DayId;
    await store.load(day);
    store.edit(day, 'um');
    store.edit(day, 'dois');
    await vi.advanceTimersByTimeAsync(600);
    expect(storage.writes).toHaveLength(1);
    expect(storage.writes[0].markdown).toBe('dois');
  });

  it('retains dirty text after a write error and supports retry', async () => {
    const storage = new FakeStorage();
    const store = new DayStore(storage, { debounceMs: 1, writerId: 'test' });
    const day = '2026-09-24' as DayId;
    await store.load(day);
    storage.failWrites = true;
    store.edit(day, 'não perder');
    await vi.advanceTimersByTimeAsync(1);
    expect(store.getStatus(day)).toBe('save-error');
    expect(store.getText(day)).toBe('não perder');
    storage.failWrites = false;
    await store.retry(day);
    expect(store.getStatus(day)).toBe('ready-clean');
  });

  it('enters conflict instead of overwriting dirty local text', async () => {
    const storage = new FakeStorage();
    const store = new DayStore(storage, { debounceMs: 600, writerId: 'local' });
    const day = '2026-09-24' as DayId;
    await store.load(day);
    store.edit(day, 'minha versão');
    const remote: DayRecord = {
      schemaVersion: 1, day, markdown: 'remota', updatedAt: new Date().toISOString(),
      writerId: 'other', revisionId: 'remote-revision', parentRevisionId: null,
    };
    storage.data.set(day, remote);
    storage.listeners.forEach((listener) => listener());
    await vi.advanceTimersByTimeAsync(50);
    expect(store.getStatus(day)).toBe('conflict');
    expect(store.getConflict(day)?.local.markdown).toBe('minha versão');
    expect(store.getConflict(day)?.remote.markdown).toBe('remota');
  });

  it('allows typing again after the document is cleared', async () => {
    const storage = new FakeStorage();
    const store = new DayStore(storage, { debounceMs: 1, writerId: 'test' });
    const day = '2026-09-24' as DayId;
    await store.load(day);
    store.edit(day, 'first');
    await vi.advanceTimersByTimeAsync(1);
    store.edit(day, '');
    await vi.advanceTimersByTimeAsync(1);
    store.edit(day, 'second');
    await vi.advanceTimersByTimeAsync(1);
    expect(store.getText(day)).toBe('second');
    expect(store.getStatus(day)).toBe('ready-clean');
  });
});
