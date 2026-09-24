import { addDays, formatDay, todayId } from './date';
import { DayStore } from './day-store';
import { createDayEditor, type DayEditor } from './day-editor';
import { exportDay, exportRange } from './export';
import { SpStorageAdapter } from './sp-adapter';
import type { DayId, DaySnapshot } from './types';
import type { JournalPluginAPI } from './plugin-api';
import { renderMarkdown } from './markdown-preview';
import { searchNotes, type SearchResult } from './search';
import { appendQuickNote } from './quick-note';
import { RecoveryBackup } from './recovery-backup';

declare global {
  interface Window {
    PluginAPI: JournalPluginAPI;
    __spJournalFocusToday?: () => void;
    __spJournalAddQuickNote?: (text: string) => void;
  }
}

export interface JournalWindow extends Window {
  PluginAPI: JournalPluginAPI;
}

export function boot(targetWindow: JournalWindow): void {
const window = targetWindow;
const document = targetWindow.document;
const api = targetWindow.PluginAPI;
const appRoot = document.querySelector<HTMLElement>('#app') ?? (() => {
  throw new Error('Journal root is missing');
})();

const storage = new SpStorageAdapter(api, new RecoveryBackup(targetWindow.localStorage));
const editors = new Map<DayId, DayEditor>();
const selections = new Map<DayId, { anchor: number; head: number }>();
const store = new DayStore(storage, {
  onChange: (day, snapshot) => updateCard(day, snapshot),
  onRemoteText: (day, text) => {
    editors.get(day)?.setText(text);
    updatePreview(day, text);
  },
});

targetWindow.parent.__spJournalFocusToday = () => {
  void focusTodayForShortcut();
};
targetWindow.parent.__spJournalAddQuickNote = (text) => {
  void addQuickNote(text);
};

let renderedDays: DayId[] = [];
let windowStart = 0;
let loadingOlder = false;
let activeDay = todayId();

buildShell();
resetAround(activeDay);
window.addEventListener('scroll', () => {
  if (window.innerHeight + window.scrollY > document.documentElement.scrollHeight - 800) {
    void loadOlder();
  }
}, { passive: true });
window.addEventListener('beforeunload', () => void store.flushAll());

function buildShell(): void {
  appRoot.innerHTML = `
    <section class="journal-shell" aria-labelledby="journal-title">
      <header class="journal-toolbar">
        <div class="journal-brand"><h1 id="journal-title" class="journal-title">Journal</h1><span>Markdown notes</span></div>
        <div class="journal-actions">
          <label class="date-control">Date <input id="date-picker" type="date" aria-label="Go to date" /></label>
          <button id="go-date" class="primary">Go</button>
          <button id="go-today">Today</button>
          <button id="export-day">Export day</button>
          <details class="search-menu"><summary>Search</summary><div class="search-fields"><input id="journal-search" type="search" placeholder="Search loaded notes" aria-label="Search loaded notes" /><button id="search-button" class="primary">Find</button></div></details>
          <details class="export-menu"><summary>Export range</summary><div class="export-range-fields"><label>From <input id="range-from" type="date" aria-label="Start date" /></label><label>To <input id="range-to" type="date" aria-label="End date" /></label><button id="export-range">Export ZIP</button></div></details>
        </div>
      </header>
      <div id="journal-status" class="journal-status" aria-live="polite"></div>
      <div id="journal-search-results" class="journal-search-results" aria-live="polite"></div>
      <div id="journal-feed" class="journal-feed" aria-label="Dias do journal"></div>
      <div class="feed-loader"><button id="load-more" class="load-more">Load more days</button></div>
    </section>`;
  document.querySelector<HTMLButtonElement>('#go-today')?.addEventListener('click', () => resetAround(todayId()));
  document.querySelector<HTMLButtonElement>('#go-date')?.addEventListener('click', () => {
    const value = document.querySelector<HTMLInputElement>('#date-picker')?.value;
    if (value) resetAround(value as DayId);
  });
  document.querySelector<HTMLButtonElement>('#export-day')?.addEventListener('click', () => {
    void exportDay(store, activeDay).catch(() => announce('Could not export the day.'));
  });
  document.querySelector<HTMLButtonElement>('#export-range')?.addEventListener('click', () => {
    const from = document.querySelector<HTMLInputElement>('#range-from')?.value;
    const to = document.querySelector<HTMLInputElement>('#range-to')?.value;
    if (!from || !to) return announce('Choose both dates for the range.');
    void exportRange(store, from as DayId, to as DayId)
      .then((result) => announce(`${result.exported} day(s) exported; empty days skipped.`))
      .catch(() => announce('Could not export the range.'));
  });
  document.querySelector<HTMLButtonElement>('#load-more')?.addEventListener('click', () => void loadOlder());
  document.querySelector<HTMLButtonElement>('#search-button')?.addEventListener('click', runSearch);
  document.querySelector<HTMLInputElement>('#journal-search')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') runSearch();
  });
}

function runSearch(): void {
  const input = document.querySelector<HTMLInputElement>('#journal-search');
  const results = document.querySelector<HTMLElement>('#journal-search-results');
  if (!input || !results) return;
  const matches = searchNotes(input.value, store.loadedCandidates());
  if (!input.value.trim()) {
    results.replaceChildren();
    return;
  }
  if (matches.length === 0) {
    results.textContent = 'No matches in loaded days. Load more days to search older notes.';
    return;
  }
  results.innerHTML = `<strong>${matches.length} result(s)</strong>${matches.map(searchResultHtml).join('')}`;
  results.querySelectorAll<HTMLButtonElement>('[data-search-day]').forEach((button) => {
    button.addEventListener('click', () => {
      resetAround(button.dataset.searchDay as DayId);
      results.replaceChildren();
      input.value = '';
      document.querySelector<HTMLDetailsElement>('.search-menu')?.removeAttribute('open');
    });
  });
}

function searchResultHtml(result: SearchResult): string {
  return `<button class="search-result" data-search-day="${result.day}"><strong>${result.day}</strong><span>${escapeHtml(result.snippet)}</span></button>`;
}

function resetAround(center: DayId): void {
  try {
    const days: DayId[] = [];
    for (let offset = 0; offset < 7; offset += 1) days.push(addDays(center, -offset));
    renderedDays = days;
    windowStart = 0;
    activeDay = center;
    renderFeed();
    document.querySelector<HTMLInputElement>('#date-picker')!.value = center;
    window.scrollTo({ top: 0, behavior: 'auto' });
    window.setTimeout(() => {
      document.querySelector<HTMLElement>(`[data-day="${center}"]`)?.scrollIntoView({ block: 'start' });
    }, 0);
  } catch {
    announce('Invalid date.');
  }
}

async function focusTodayForShortcut(): Promise<void> {
  const day = todayId();
  activeDay = day;
  if (!document.querySelector<HTMLElement>(`[data-day="${day}"]`)) {
    resetAround(day);
  }
  await store.load(day);
  updateCard(day, store.snapshot(day));
  ensureEditor(day, true);
  const editor = editors.get(day);
  if (!editor) return;
  const end = editor.view.state.doc.length;
  editor.view.dispatch({ selection: { anchor: end } });
  editor.view.focus();
}

async function addQuickNote(text: string): Promise<void> {
  const day = todayId();
  await store.load(day);
  const nextText = appendQuickNote(store.getText(day), text);
  if (nextText === store.getText(day)) return;
  store.edit(day, nextText);
  await store.flush(day);
  activeDay = day;
  if (!document.querySelector<HTMLElement>(`[data-day="${day}"]`)) resetAround(day);
  updateCard(day, store.snapshot(day));
  ensureEditor(day, true);
  focusEditorAtEnd(day);
  window.setTimeout(() => focusEditorAtEnd(day), 100);
}

function focusEditorAtEnd(day: DayId): void {
  const editor = editors.get(day);
  if (!editor) return;
  const end = editor.view.state.doc.length;
  editor.view.dispatch({ selection: { anchor: end } });
  editor.view.focus();
}

async function loadOlder(): Promise<void> {
  if (loadingOlder) return;
  loadingOlder = true;
  const feed = document.querySelector<HTMLElement>('#journal-feed');
  const anchor = feed?.lastElementChild as HTMLElement | null;
  const anchorDay = anchor?.dataset.day as DayId | undefined;
  const before = anchor?.getBoundingClientRect().top ?? 0;
  const oldest = renderedDays[renderedDays.length - 1];
  const additions = Array.from({ length: 14 }, (_, index) => addDays(oldest, -(index + 1)));
  renderedDays = [...renderedDays, ...additions];
  windowStart = Math.min(
    windowStart + additions.length,
    Math.max(0, renderedDays.length - 45),
  );
  renderFeed();
  await Promise.all(additions.map((day) => store.load(day)));
  const after = (anchorDay
    ? document.querySelector<HTMLElement>(`[data-day="${anchorDay}"]`)?.getBoundingClientRect().top
    : undefined) ?? before;
  window.scrollBy(0, after - before);
  loadingOlder = false;
}

function renderFeed(): void {
  const feed = document.querySelector<HTMLElement>('#journal-feed');
  if (!feed) return;
  for (const editor of editors.values()) editor.destroy();
  editors.clear();
  feed.replaceChildren();
  for (const day of renderedDays.slice(windowStart, windowStart + 45)) {
    const card = document.createElement('article');
    card.className = `day-card${day === activeDay ? ' active' : ''}`;
    card.dataset.day = day;
    card.innerHTML = `<header><h2>${escapeHtml(formatDay(day))}</h2><span class="day-status">Loading…</span></header><div class="editor-host"></div>`;
    feed.appendChild(card);
    void store.load(day).then(() => {
      const snapshot = store.snapshot(day);
      updateCard(day, snapshot);
      if (day === activeDay && snapshot.text !== '') editors.get(day)?.view.focus();
    });
  }
  document.querySelector<HTMLElement>('#app')!.setAttribute('aria-busy', 'false');
}

function updateCard(day: DayId, snapshot: DaySnapshot): void {
  const card = document.querySelector<HTMLElement>(`[data-day="${day}"]`);
  if (!card) return;
  const status = card.querySelector<HTMLElement>('.day-status');
  if (status) status.textContent = statusLabel(snapshot.status);
  const host = card.querySelector<HTMLElement>('.editor-host');
  if (!host) return;
  if (snapshot.status === 'save-error') {
    destroyEditor(day);
    host.innerHTML = `<div class="day-error" role="alert">Not saved. <button data-action="retry">Retry</button>${store.getError(day) ? ' Check the payload limit or the SP connection.' : ''}</div>`;
    host.querySelector('button')?.addEventListener('click', () => void store.retry(day));
    return;
  }
  if (snapshot.status === 'conflict' && snapshot.conflict) {
    destroyEditor(day);
    host.innerHTML = `<div class="day-conflict" role="alert"><strong>Conflict on this day.</strong><div class="day-actions"><button data-action="mine">Keep my version</button><button data-action="remote">Use received version</button><button data-action="copy">Copy both</button></div></div>`;
    host.querySelector('[data-action="mine"]')?.addEventListener('click', () => store.keepMine(day));
    host.querySelector('[data-action="remote"]')?.addEventListener('click', () => store.useRemote(day));
    host.querySelector('[data-action="copy"]')?.addEventListener('click', () => {
      const conflict = store.getConflict(day);
      if (conflict) void navigator.clipboard?.writeText(`My version:\n${conflict.local.markdown}\n\nReceived version:\n${conflict.remote.markdown}`);
      announce('Both versions were copied when supported by the environment.');
    });
    return;
  }
  if (snapshot.status === 'unloaded' || snapshot.status === 'loading') return;
  if (snapshot.text === '' && !editors.has(day)) {
    host.innerHTML = '<div class="empty-day" tabindex="0" role="button" aria-label="Write a note"><span>Empty</span><strong>Click to write</strong></div>';
    host.querySelector('.empty-day')?.addEventListener('click', () => ensureEditor(day, true));
    host.querySelector('.empty-day')?.addEventListener('keydown', (event) => {
      const keyboardEvent = event as KeyboardEvent;
      if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') ensureEditor(day, true);
    });
    return;
  }
  if (snapshot.text === '' && editors.has(day)) return;
  if (!editors.has(day)) renderReadOnly(day, snapshot.text);
}

function renderReadOnly(day: DayId, text: string): void {
  const card = document.querySelector<HTMLElement>(`[data-day="${day}"]`);
  const host = card?.querySelector<HTMLElement>('.editor-host');
  if (!host) return;
  host.innerHTML = `<div class="markdown-preview" tabindex="0" role="button" aria-label="Click to edit this note">${renderMarkdown(text)}</div>`;
  const preview = host.querySelector<HTMLElement>('.markdown-preview');
  preview?.addEventListener('click', () => ensureEditor(day, true));
  preview?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') ensureEditor(day, true);
  });
}

function ensureEditor(day: DayId, focus = false): void {
  const existing = editors.get(day);
  if (existing) {
    if (focus) existing.view.focus();
    return;
  }
  const card = document.querySelector<HTMLElement>(`[data-day="${day}"]`);
  const host = card?.querySelector<HTMLElement>('.editor-host');
  if (!host) return;
  host.innerHTML = '<div class="editor-input"></div>';
  const editorHost = host.querySelector<HTMLElement>('.editor-input');
  if (!editorHost) return;
  editorHost.addEventListener('focusin', () => { activeDay = day; });
  editorHost.addEventListener('focusout', () => {
    window.setTimeout(() => {
      if (!host.contains(document.activeElement) && store.getText(day) !== '') exitEditor(day);
    }, 0);
  });
  const editor = createDayEditor(
    editorHost,
    store.getText(day),
    (text) => {
      store.edit(day, text);
    },
    () => void store.flush(day),
    selections.get(day),
  );
  editors.set(day, editor);
  if (focus) editor.view.focus();
  card?.addEventListener('focusin', () => { activeDay = day; }, { once: true });
  if (editors.size > 12) {
    const candidate = [...editors.keys()].find((candidateDay) => candidateDay !== day && store.getStatus(candidateDay) === 'ready-clean');
    if (candidate) {
      const candidateEditor = editors.get(candidate);
      if (candidateEditor) {
        selections.set(candidate, {
          anchor: candidateEditor.view.state.selection.main.anchor,
          head: candidateEditor.view.state.selection.main.head,
        });
        candidateEditor.destroy();
        editors.delete(candidate);
      }
    }
  }
}

function exitEditor(day: DayId): void {
  void store.flush(day);
  destroyEditor(day);
  updateCard(day, store.snapshot(day));
}

function destroyEditor(day: DayId): void {
  const editor = editors.get(day);
  if (!editor) return;
  editor.destroy();
  editors.delete(day);
}

function updatePreview(day: DayId, text: string): void {
  const preview = document.querySelector<HTMLElement>(`[data-day="${day}"] .markdown-preview`);
  if (preview) preview.innerHTML = renderMarkdown(text);
}

function statusLabel(status: DaySnapshot['status']): string {
  return ({
    unloaded: 'Not loaded',
    loading: 'Loading…',
    'ready-clean': 'Saved',
    'ready-dirty': 'Saving…',
    saving: 'Saving…',
    'save-error': 'Not saved',
    conflict: 'Conflict',
  } as Record<DaySnapshot['status'], string>)[status];
}

function announce(message: string): void {
  const element = document.querySelector<HTMLElement>('#journal-status');
  if (element) element.textContent = message;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);
}
}
