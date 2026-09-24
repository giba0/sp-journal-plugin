import { appendQuickNote } from '../src/quick-note';

describe('quick journal note', () => {
  it('appends text to today without adding an unnecessary blank line', () => {
    expect(appendQuickNote('Existing note', 'Next line')).toBe('Existing note\nNext line');
    expect(appendQuickNote('Existing note\n', 'Next line')).toBe('Existing note\nNext line');
  });

  it('ignores an empty quick note', () => {
    expect(appendQuickNote('Existing note', '  \n')).toBe('Existing note');
  });
});
