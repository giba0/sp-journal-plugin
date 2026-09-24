import type { DayId } from './types';

const PREFIX = 'sp-journal-markdown/recovery/v1/day/';

export class RecoveryBackup {
  constructor(private readonly storage: Storage | null = safeStorage()) {}

  read(day: DayId): string | null {
    try {
      return this.storage?.getItem(`${PREFIX}${day}`) ?? null;
    } catch {
      return null;
    }
  }

  write(day: DayId, encodedRecord: string): void {
    try {
      this.storage?.setItem(`${PREFIX}${day}`, encodedRecord);
    } catch {
      // A quota or privacy-mode failure must not turn a confirmed SP write into an error.
    }
  }
}

function safeStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}
