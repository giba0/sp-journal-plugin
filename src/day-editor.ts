import { defaultKeymap, indentWithTab, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import {
  EditorView,
  keymap,
  ViewUpdate,
} from '@codemirror/view';

export interface DayEditor {
  view: EditorView;
  setText(text: string): void;
  destroy(): void;
}

export function createDayEditor(
  parent: HTMLElement,
  text: string,
  onChange: (text: string) => void,
  onSave: () => void,
  selection?: { anchor: number; head: number },
  onEscape?: () => void,
): DayEditor {
  let applyingRemote = false;
  const saveKeymap = keymap.of([
    {
      key: 'Mod-s',
      run: () => {
        onSave();
        return true;
      },
    },
  ]);
  const state = EditorState.create({
    doc: text,
    selection,
    extensions: [
      history(),
      markdown(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      EditorView.lineWrapping,
      keymap.of([{ key: 'Enter', run: continueMarkdownList }]),
      keymap.of([{ key: 'Escape', run: () => { onEscape?.(); return true; } }]),
      keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
      saveKeymap,
      EditorView.updateListener.of((update: ViewUpdate) => {
        if (update.docChanged && !applyingRemote) onChange(update.state.doc.toString());
      }),
      EditorView.theme({
        '&': { minHeight: '5rem', caretColor: 'var(--journal-primary, #356ae6)' },
        '.cm-scroller': { overflow: 'visible', fontFamily: 'var(--font-primary-stack, sans-serif)' },
        '.cm-content': { padding: '0.75rem 0' },
        '.cm-line': { padding: '0 0.25rem' },
        '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--journal-primary, #356ae6)', borderLeftWidth: '2px' },
        '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': { backgroundColor: 'color-mix(in srgb, var(--journal-primary, #356ae6) 28%, transparent)' },
        '.cm-gutters': { display: 'none' },
        '&.cm-focused': { outline: 'none' },
      }),
    ],
  });
  const view = new EditorView({ state, parent, root: parent.ownerDocument });
  return {
    view,
    setText(nextText) {
      if (nextText === view.state.doc.toString()) return;
      applyingRemote = true;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: nextText },
      });
      applyingRemote = false;
    },
    destroy() {
      view.destroy();
    },
  };
}

export function continueMarkdownList(view: EditorView): boolean {
  const selection = view.state.selection.main;
  if (!selection.empty) return false;
  const line = view.state.doc.lineAt(selection.head);
  if (selection.head !== line.to) return false;
  const match = /^(\s*)([-*+]\s+|\d+[.)]\s+)(.*)$/.exec(line.text);
  if (!match) return false;
  const [, indentation, marker, content] = match;
  if (content.trim() === '') {
    view.dispatch({
      changes: { from: line.from, to: line.to, insert: '\n' },
      selection: { anchor: line.from + 1 },
    });
    return true;
  }
  const nextMarker = /^\d/.test(marker)
    ? `${Number.parseInt(marker, 10) + 1}${marker.includes(')') ? ')' : '.'} `
    : marker;
  const continuation = `\n${indentation}${nextMarker}`;
  view.dispatch({
    changes: { from: selection.head, insert: continuation },
    selection: { anchor: selection.head + continuation.length },
  });
  return true;
}
