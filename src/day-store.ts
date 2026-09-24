import type { DayId, DayConflict, DayRecord, DaySnapshot, DayStatus, JournalStorage } from './types';
import type { SearchCandidate } from './search';

export interface DayStoreOptions {
  debounceMs?: number;
  writerId?: string;
  onChange?: (day: DayId, snapshot: DaySnapshot) => void;
  onRemoteText?: (day: DayId, text: string) => void;
}

interface Entry {
  day: DayId;
  text: string;
  status: DayStatus;
  base: DayRecord | null;
  lastWritten: DayRecord | null;
  generation: number;
  timer: ReturnType<typeof setTimeout> | null;
  savePromise: Promise<void> | null;
  lastError: Error | null;
  conflict: DayConflict | null;
}

export class DayStore {
  private readonly entries = new Map<DayId, Entry>();
  private readonly debounceMs: number;
  private readonly writerId: string;
  private readonly onChange?: DayStoreOptions['onChange'];
  private readonly onRemoteText?: DayStoreOptions['onRemoteText'];
  private unsubscribe: (() => void) | null = null;
  private reloadTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly storage: JournalStorage, options: DayStoreOptions = {}) {
    this.debounceMs = options.debounceMs ?? 600;
    this.writerId = options.writerId ?? createId();
    this.onChange = options.onChange;
    this.onRemoteText = options.onRemoteText;
    this.unsubscribe = storage.subscribeChanges(() => this.scheduleReload());
  }

  dispose(): void {
    if (this.reloadTimer) clearTimeout(this.reloadTimer);
    for (const entry of this.entries.values()) {
      if (entry.timer) clearTimeout(entry.timer);
    }
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  snapshot(day: DayId): DaySnapshot {
    const entry = this.entry(day);
    return {
      day,
      text: entry.text,
      status: entry.status,
      baseRevisionId: entry.base?.revisionId ?? null,
      lastWrittenRevisionId: entry.lastWritten?.revisionId ?? null,
      conflict: entry.conflict,
    };
  }

  getText(day: DayId): string {
    return this.entry(day).text;
  }

  getStatus(day: DayId): DayStatus {
    return this.entry(day).status;
  }

  getError(day: DayId): Error | null {
    return this.entry(day).lastError;
  }

  getConflict(day: DayId): DayConflict | null {
    return this.entry(day).conflict;
  }

  loadedCandidates(): SearchCandidate[] {
    return [...this.entries.values()]
      .filter((entry) => entry.status !== 'unloaded' && entry.status !== 'loading' && entry.text !== '')
      .map((entry) => ({ day: entry.day, text: entry.text }));
  }

  async load(day: DayId): Promise<void> {
    const entry = this.entry(day);
    if (entry.status !== 'unloaded') return;
    this.setStatus(entry, 'loading');
    try {
      const record = await this.storage.read(day);
      entry.base = record;
      entry.lastWritten = record;
      entry.text = record?.markdown ?? '';
      entry.lastError = null;
      this.setStatus(entry, 'ready-clean');
    } catch (error) {
      entry.lastError = toError(error);
      this.setStatus(entry, 'save-error');
    }
  }

  edit(day: DayId, text: string): void {
    const entry = this.entry(day);
    entry.text = text;
    entry.generation += 1;
    entry.lastError = null;
    if (entry.conflict) entry.conflict = null;
    this.setStatus(entry, 'ready-dirty');
    if (entry.timer) clearTimeout(entry.timer);
    entry.timer = setTimeout(() => {
      entry.timer = null;
      void this.flush(day);
    }, this.debounceMs);
  }

  async retry(day: DayId): Promise<void> {
    const entry = this.entry(day);
    if (entry.status === 'save-error' && entry.base === null && entry.text === '') {
      entry.status = 'unloaded';
      await this.load(day);
      return;
    }
    if (entry.status === 'save-error') {
      entry.lastError = null;
      entry.generation += 1;
      this.setStatus(entry, 'ready-dirty');
    }
    await this.flush(day);
  }

  async flush(day: DayId): Promise<void> {
    const entry = this.entry(day);
    if (entry.timer) {
      clearTimeout(entry.timer);
      entry.timer = null;
    }
    if (entry.conflict || entry.status === 'unloaded' || entry.status === 'loading') return;
    if (entry.savePromise) return entry.savePromise;
    if (entry.status !== 'ready-dirty' && entry.status !== 'save-error') return;
    if (entry.status === 'save-error') this.setStatus(entry, 'ready-dirty');
    entry.savePromise = this.saveLoop(entry).finally(() => {
      entry.savePromise = null;
    });
    return entry.savePromise;
  }

  async flushAll(): Promise<void> {
    await Promise.all([...this.entries.keys()].map((day) => this.flush(day)));
  }

  keepMine(day: DayId): void {
    const entry = this.entry(day);
    if (!entry.conflict) return;
    entry.base = entry.conflict.remote;
    entry.conflict = null;
    entry.generation += 1;
    this.setStatus(entry, 'ready-dirty');
    void this.flush(day);
  }

  useRemote(day: DayId): void {
    const entry = this.entry(day);
    const remote = entry.conflict?.remote;
    if (!remote) return;
    entry.text = remote.markdown;
    entry.base = remote;
    entry.lastWritten = remote;
    entry.conflict = null;
    entry.generation += 1;
    this.setStatus(entry, 'ready-clean');
    this.onRemoteText?.(day, remote.markdown);
  }

  private async saveLoop(entry: Entry): Promise<void> {
    while (entry.status === 'ready-dirty' || entry.status === 'saving') {
      const generation = entry.generation;
      const text = entry.text;
      if (entry.lastWritten?.markdown === text && entry.base?.markdown === text) {
        this.setStatus(entry, 'ready-clean');
        return;
      }
      const record: DayRecord = {
        schemaVersion: 1,
        day: entry.day,
        markdown: text,
        updatedAt: new Date().toISOString(),
        writerId: this.writerId,
        revisionId: createId(),
        parentRevisionId: entry.base?.revisionId ?? null,
      };
      this.setStatus(entry, 'saving');
      try {
        await this.storage.write(entry.day, record);
        entry.lastWritten = record;
        entry.base = record;
        entry.lastError = null;
        if (generation === entry.generation && entry.text === text) {
          this.setStatus(entry, 'ready-clean');
          return;
        }
        this.setStatus(entry, 'ready-dirty');
      } catch (error) {
        entry.lastError = toError(error);
        this.setStatus(entry, 'save-error');
        return;
      }
    }
  }

  private scheduleReload(): void {
    if (this.reloadTimer) return;
    this.reloadTimer = setTimeout(() => {
      this.reloadTimer = null;
      void this.reloadLoaded();
    }, 50);
  }

  private async reloadLoaded(): Promise<void> {
    const days = [...this.entries.values()].filter(
      (entry) => entry.status !== 'unloaded' && entry.status !== 'loading',
    );
    await Promise.all(days.map((entry) => this.reconcile(entry)));
  }

  private async reconcile(entry: Entry): Promise<void> {
    let remote: DayRecord | null;
    try {
      remote = await this.storage.read(entry.day);
    } catch {
      return;
    }
    if (!remote || remote.revisionId === entry.base?.revisionId) return;
    if (remote.markdown === entry.text) {
      entry.base = remote;
      entry.lastWritten = remote;
      if (entry.status === 'saving') return;
      this.setStatus(entry, 'ready-clean');
      return;
    }
    const hasLocalChanges =
      entry.status === 'ready-dirty' || entry.status === 'saving' || entry.status === 'save-error';
    if (hasLocalChanges && remote.revisionId !== entry.base?.revisionId) {
      const local: DayRecord = {
        schemaVersion: 1,
        day: entry.day,
        markdown: entry.text,
        updatedAt: new Date().toISOString(),
        writerId: this.writerId,
        revisionId: createId(),
        parentRevisionId: entry.base?.revisionId ?? null,
      };
      entry.conflict = { local, remote };
      if (entry.timer) clearTimeout(entry.timer);
      this.setStatus(entry, 'conflict');
      return;
    }
    entry.text = remote.markdown;
    entry.base = remote;
    entry.lastWritten = remote;
    entry.conflict = null;
    this.setStatus(entry, 'ready-clean');
    this.onRemoteText?.(entry.day, remote.markdown);
  }

  private entry(day: DayId): Entry {
    let entry = this.entries.get(day);
    if (!entry) {
      entry = {
        day,
        text: '',
        status: 'unloaded',
        base: null,
        lastWritten: null,
        generation: 0,
        timer: null,
        savePromise: null,
        lastError: null,
        conflict: null,
      };
      this.entries.set(day, entry);
    }
    return entry;
  }

  private setStatus(entry: Entry, status: DayStatus): void {
    entry.status = status;
    this.onChange?.(entry.day, this.snapshot(entry.day));
  }
}

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error('Unknown error');
}
