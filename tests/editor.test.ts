import { createDayEditor, continueMarkdownList } from '../src/day-editor';

describe('markdown editor', () => {
  it('mounts a visible CodeMirror surface with syntax highlighting', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const editor = createDayEditor(host, '# Heading\n\n- item\n\n[link](https://example.com)', () => undefined, () => undefined);
    expect(host.querySelector('.cm-editor')).not.toBeNull();
    expect(host.querySelector('.cm-content')).not.toBeNull();
    expect(host.textContent).toContain('Heading');
    editor.destroy();
  });

  it('continues a Markdown bullet when pressing Enter', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const editor = createDayEditor(host, '- first', () => undefined, () => undefined);
    editor.view.dispatch({ selection: { anchor: editor.view.state.doc.length } });
    expect(continueMarkdownList(editor.view)).toBe(true);
    expect(editor.view.state.doc.toString()).toBe('- first\n- ');
    editor.destroy();
  });

  it('mounts into an iframe document when the runtime is hosted by the parent', () => {
    const iframeDocument = document.implementation.createHTMLDocument('iframe');
    const host = iframeDocument.createElement('div');
    iframeDocument.body.append(host);
    const editor = createDayEditor(host, '- item', () => undefined, () => undefined);
    expect(host.querySelector('.cm-editor')?.ownerDocument).toBe(iframeDocument);
    expect(host.querySelector('.cm-content')?.getAttribute('contenteditable')).toBe('true');
    editor.destroy();
  });
});
