import JSZip from 'jszip';
import type { DayId } from './types';
import { enumerateDays } from './date';
import { DayStore } from './day-store';

export async function exportDay(store: DayStore, day: DayId): Promise<void> {
  await store.load(day);
  await store.flush(day);
  downloadBlob(`${day}.md`, new Blob([store.getText(day)], { type: 'text/markdown;charset=utf-8' }));
}

export async function buildArchive(
  store: DayStore,
  days: DayId[],
): Promise<Uint8Array> {
  const zip = new JSZip();
  for (const day of days) {
    await store.load(day);
    await store.flush(day);
    const text = store.getText(day);
    if (text !== '') zip.file(`${day}.md`, text);
  }
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}

export async function exportRange(
  store: DayStore,
  from: DayId,
  to: DayId,
): Promise<{ exported: number; skipped: number }> {
  const days = enumerateDays(from, to);
  const archive = await buildArchive(store, days);
  downloadBlob(
    `${from}_a_${to}.zip`,
    new Blob([archive.buffer as ArrayBuffer], { type: 'application/zip' }),
  );
  const exported = days.filter((day) => store.getText(day) !== '').length;
  return { exported, skipped: days.length - exported };
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
