import type { DayId } from './types';

export interface SearchCandidate {
  day: DayId;
  text: string;
}

export interface SearchResult extends SearchCandidate {
  snippet: string;
}

export function searchNotes(query: string, candidates: SearchCandidate[], limit = 20): SearchResult[] {
  const needle = normalize(query).trim();
  if (!needle) return [];
  return candidates
    .filter((candidate) => normalize(candidate.text).includes(needle))
    .map((candidate) => ({ ...candidate, snippet: makeSnippet(candidate.text, needle) }))
    .slice(0, limit);
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function makeSnippet(text: string, needle: string): string {
  const lines = text.split(/\r?\n/);
  const line = lines.find((value) => normalize(value).includes(needle)) ?? lines[0] ?? '';
  return line.length > 140 ? `${line.slice(0, 137)}...` : line;
}
