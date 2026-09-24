import { decodeDayRecord, encodeDayRecord } from './codec';
import type { DayId, DayRecord, JournalStorage } from './types';
import type { JournalPluginAPI } from './plugin-api';
import { RecoveryBackup } from './recovery-backup';

export const JOURNAL_KEY_PREFIX = 'journal/v1/day/';

export class SpStorageAdapter implements JournalStorage {
  private subscribed = false;

  constructor(
    private readonly api: JournalPluginAPI,
    private readonly recovery = new RecoveryBackup(),
  ) {}

  async read(day: DayId): Promise<DayRecord | null> {
    const raw = await this.api.loadSyncedData(this.key(day));
    if (raw !== null) {
      const record = decodeDayRecord(raw, day);
      this.recovery.write(day, raw);
      return record;
    }
    const backup = this.recovery.read(day);
    if (backup === null) return null;
    let record: DayRecord;
    try {
      record = decodeDayRecord(backup, day);
    } catch {
      return null;
    }
    // Rehydrate the SP store after an uninstall/reinstall when the local
    // profile still has the recovery copy.
    try {
      await this.api.persistDataSynced(backup, this.key(day));
    } catch {
      // Keep returning the recovered text; the next edit can retry the sync write.
    }
    return record;
  }

  write(day: DayId, record: DayRecord): Promise<void> {
    if (record.day !== day) throw new Error('Record day and storage key do not match');
    const encoded = encodeDayRecord(record);
    return this.api.persistDataSynced(encoded, this.key(day)).then(() => {
      this.recovery.write(day, encoded);
    });
  }

  subscribeChanges(listener: () => void): () => void {
    if (!this.subscribed) {
      this.api.registerHook(this.api.Hooks.PERSISTED_DATA_CHANGED, listener);
      this.subscribed = true;
    }
    return () => undefined;
  }

  private key(day: DayId): string {
    return `${JOURNAL_KEY_PREFIX}${day}`;
  }
}
