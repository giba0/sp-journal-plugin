export function renderMarkdown(markdown: string): string {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const output: string[] = [];
  let paragraph: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  let code = false;
  let codeLines: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      output.push(`<p>${inlineMarkdown(paragraph.join('\n'))}</p>`);
      paragraph = [];
    }
  };
  const closeList = () => {
    if (list) output.push(`</${list}>`);
    list = null;
  };

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      flushParagraph();
      closeList();
      if (code) {
        output.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
        codeLines = [];
      }
      code = !code;
      continue;
    }
    if (code) {
      codeLines.push(line);
      continue;
    }
    const heading = /^(#{1,6})\s*(.*)$/.exec(line);
    const bullet = /^\s*[-*+]\s+(.+)$/.exec(line);
    const ordered = /^\s*\d+[.)]\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length;
      output.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
    } else if (bullet || ordered) {
      flushParagraph();
      const nextList = bullet ? 'ul' : 'ol';
      if (list !== nextList) {
        closeList();
        list = nextList;
        output.push(`<${list}>`);
      }
      output.push(`<li>${inlineMarkdown((bullet ?? ordered)![1])}</li>`);
    } else if (line.trim() === '') {
      flushParagraph();
      closeList();
    } else if (line.startsWith('> ')) {
      flushParagraph();
      closeList();
      output.push(`<blockquote>${inlineMarkdown(line.slice(2))}</blockquote>`);
    } else {
      paragraph.push(line);
    }
  }
  flushParagraph();
  closeList();
  if (code) output.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
  return output.join('');
}

function inlineMarkdown(value: string): string {
  let result = escapeHtml(value);
  result = result.replace(/`([^`]+)`/g, '<code>$1</code>');
  result = result.replace(/\[([^\]]+)\]\(([^\s)]+)\)/g, (_match, label: string, href: string) => {
    const safeHref = /^(?:https?:|mailto:)/i.test(href) ? href : '#';
    return `<a href="${escapeHtml(safeHref)}" target="_blank" rel="noreferrer">${label}</a>`;
  });
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  result = result.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  result = result.replace(/(?<!_)_([^_]+)_(?!_)/g, '<em>$1</em>');
  return result.replace(/\n/g, '<br />');
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);
}
