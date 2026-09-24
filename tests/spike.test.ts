import { SpStorageAdapter } from '../src/sp-adapter';
import type { DayId } from '../src/types';
import type { JournalPluginAPI } from '../src/plugin-api';
import { RecoveryBackup } from '../src/recovery-backup';

function host(): { api: JournalPluginAPI; restart: () => JournalPluginAPI; fire: () => void; clear: () => void } {
  const data = new Map<string, string>();
  const listeners = new Set<() => void>();
  const createApi = (): JournalPluginAPI => ({
    Hooks: { PERSISTED_DATA_CHANGED: 'persistedDataChanged' },
    persistDataSynced: async (value, key) => { data.set(key ?? '', value); listeners.forEach((listener) => listener()); },
    loadSyncedData: async (key) => data.get(key ?? '') ?? null,
    registerHook: (_hook, listener) => { listeners.add(listener); },
    showSnack: () => undefined,
  });
  let api = createApi();
  return {
    api,
    restart: () => { api = createApi(); return api; },
    fire: () => listeners.forEach((listener) => listener()),
    clear: () => data.clear(),
  };
}

describe('persistence spike', () => {
  it('keeps two keyed values independent across a simulated restart', async () => {
    const h = host();
    const a = new SpStorageAdapter(h.api);
    const dayA = '2026-09-24' as DayId;
    const dayB = '2026-09-23' as DayId;
    const base = (day: DayId, markdown: string) => ({
      schemaVersion: 1 as const, day, markdown,
      updatedAt: '2026-09-24T20:15:00.000Z', writerId: 'spike',
      revisionId: day, parentRevisionId: null,
    });
    await a.write(dayA, base(dayA, 'A'));
    await a.write(dayB, base(dayB, 'B'));
    const restarted = new SpStorageAdapter(h.restart());
    expect(await restarted.read(dayA)).toMatchObject({ markdown: 'A' });
    expect(await restarted.read(dayB)).toMatchObject({ markdown: 'B' });
    expect(await restarted.read(dayA)).not.toEqual(await restarted.read(dayB));
  });

  it('rehydrates a removed SP entry from the same-profile recovery copy', async () => {
    const recoveryData = new Map<string, string>();
    const recoveryStorage = {
      getItem: (key: string) => recoveryData.get(key) ?? null,
      setItem: (key: string, value: string) => { recoveryData.set(key, value); },
    } as unknown as Storage;
    const h = host();
    const day = '2026-09-22' as DayId;
    const record = {
      schemaVersion: 1 as const, day, markdown: 'survives removal',
      updatedAt: '2026-09-24T20:15:00.000Z', writerId: 'spike',
      revisionId: 'recovery-revision', parentRevisionId: null,
    };
    const adapter = new SpStorageAdapter(h.api, new RecoveryBackup(recoveryStorage));
    await adapter.write(day, record);
    h.clear();
    const recovered = await new SpStorageAdapter(h.restart(), new RecoveryBackup(recoveryStorage)).read(day);
    expect(recovered?.markdown).toBe('survives removal');
    expect(await h.api.loadSyncedData('journal/v1/day/2026-09-22')).not.toBeNull();
  });
});
