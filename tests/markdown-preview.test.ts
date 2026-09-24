import { renderMarkdown } from '../src/markdown-preview';

describe('live Markdown preview', () => {
  it('renders common Markdown without allowing raw HTML through', () => {
    const html = renderMarkdown('##Test\n\n- one\n- two\n\n**bold** [link](https://example.com)\n\n<script>alert(1)</script>');
    expect(html).toContain('<h2>Test</h2>');
    expect(html).toContain('<ul>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('href="https://example.com"');
    expect(html).not.toContain('<script>');
  });
});
