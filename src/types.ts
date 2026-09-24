export type DayId = `${number}-${number}-${number}`;

export interface DayRecord {
  schemaVersion: 1;
  day: DayId;
  markdown: string;
  updatedAt: string;
  writerId: string;
  revisionId: string;
  parentRevisionId: string | null;
}

export interface JournalStorage {
  read(day: DayId): Promise<DayRecord | null>;
  write(day: DayId, record: DayRecord): Promise<void>;
  subscribeChanges(listener: () => void): () => void;
}

export type DayStatus =
  | 'unloaded'
  | 'loading'
  | 'ready-clean'
  | 'ready-dirty'
  | 'saving'
  | 'save-error'
  | 'conflict';

export interface DayConflict {
  local: DayRecord;
  remote: DayRecord;
}

export interface DaySnapshot {
  day: DayId;
  text: string;
  status: DayStatus;
  baseRevisionId: string | null;
  lastWrittenRevisionId: string | null;
  conflict: DayConflict | null;
}
