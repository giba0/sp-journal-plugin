import { searchNotes } from '../src/search';

describe('journal search', () => {
  it('matches plain text case and accents without fuzzy guesses', () => {
    expect(searchNotes('cafe', [{ day: '2026-09-24', text: 'Café com notas' }])).toHaveLength(1);
    expect(searchNotes('xyz', [{ day: '2026-09-24', text: 'Café com notas' }])).toEqual([]);
  });
});
