export function appendQuickNote(current: string, quickNote: string): string {
  if (!quickNote.trim()) return current;
  if (!current) return quickNote;
  const separator = current.endsWith('\n') ? '' : '\n';
  return `${current}${separator}${quickNote}`;
}
