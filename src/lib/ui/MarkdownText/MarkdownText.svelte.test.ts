import { render } from 'vitest-browser-svelte';
import { describe, expect, it } from 'vitest';
import MarkdownText from './MarkdownText.svelte';

describe('MarkdownText', () => {
  describe('Basic Markdown Rendering', () => {
    it('should render plain text', async () => {
      const output = await render(MarkdownText, { text: 'Hello World' });
      expect(output.baseElement.textContent).toContain('Hello World');
    });

    it('should render bold text', async () => {
      const output = await render(MarkdownText, { text: '**Bold Text**' });
      expect(output.baseElement.innerHTML).toContain('<strong>Bold Text</strong>');
    });

    it('should render italic text', async () => {
      const output = await render(MarkdownText, { text: '*Italic Text*' });
      expect(output.baseElement.innerHTML).toContain('<em>Italic Text</em>');
    });

    it('should render headings', async () => {
      const output = await render(MarkdownText, { text: '# Heading 1' });
      expect(output.baseElement.innerHTML).toContain('<h1');
      expect(output.baseElement.textContent).toContain('Heading 1');
    });

    it('should render links with external attributes', async () => {
      const output = await render(MarkdownText, { text: '[Link](https://example.com)' });
      const html = output.baseElement.innerHTML;
      expect(html).toContain('href="https://example.com"');
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noreferrer"');
    });

    it('should render download links for /downloads/ paths', async () => {
      const output = await render(MarkdownText, { text: '[Download](/downloads/file.pdf)' });
      const html = output.baseElement.innerHTML;
      expect(html).toContain('href="/downloads/file.pdf"');
      expect(html).toContain('download');
    });

    it('should render lists', async () => {
      const output = await render(MarkdownText, {
        text: `- Item 1
- Item 2
- Item 3`,
      });
      expect(output.baseElement.innerHTML).toContain('<ul>');
      expect(output.baseElement.innerHTML).toContain('<li>Item 1</li>');
    });

    it('should render code blocks', async () => {
      const output = await render(MarkdownText, { text: '`inline code`' });
      expect(output.baseElement.innerHTML).toContain('<code>inline code</code>');
    });
  });

  describe('Discord Time Format', () => {
    it('should render Discord time format with full date (F)', async () => {
      const timestamp = 1761327563;
      const output = await render(MarkdownText, { text: `<t:${timestamp}:F>` });
      expect(output.baseElement.innerHTML).toContain('<time');
      expect(output.baseElement.innerHTML).toContain('datetime=');
    });

    it('should render Discord time format with short date (d)', async () => {
      const timestamp = 1761327563;
      const output = await render(MarkdownText, { text: `<t:${timestamp}:d>` });
      expect(output.baseElement.innerHTML).toContain('<time');
      expect(output.baseElement.innerHTML).toContain('datetime=');
    });

    it('should render Discord time format with relative time (R)', async () => {
      const timestamp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const output = await render(MarkdownText, { text: `<t:${timestamp}:R>` });
      expect(output.baseElement.innerHTML).toContain('<time');
      expect(output.baseElement.textContent).toMatch(/ago/);
    });

    it('should render Discord time format with long date and time (f)', async () => {
      const timestamp = 1761327563;
      const output = await render(MarkdownText, { text: `<t:${timestamp}:f>` });
      expect(output.baseElement.innerHTML).toContain('<time');
      expect(output.baseElement.innerHTML).toContain('datetime=');
    });

    it('should render Discord time format with time only (t)', async () => {
      const timestamp = 1761327563;
      const output = await render(MarkdownText, { text: `<t:${timestamp}:t>` });
      expect(output.baseElement.innerHTML).toContain('<time');
      expect(output.baseElement.innerHTML).toContain('datetime=');
    });

    it('should render Discord time format with long time (T)', async () => {
      const timestamp = 1761327563;
      const output = await render(MarkdownText, { text: `<t:${timestamp}:T>` });
      expect(output.baseElement.innerHTML).toContain('<time');
      expect(output.baseElement.innerHTML).toContain('datetime=');
    });

    it('should render Discord time format with full date and time (D)', async () => {
      const timestamp = 1761327563;
      const output = await render(MarkdownText, { text: `<t:${timestamp}:D>` });
      expect(output.baseElement.innerHTML).toContain('<time');
      expect(output.baseElement.innerHTML).toContain('datetime=');
    });
  });

  describe('Discord Mentions', () => {
    it('should render Discord user mentions', async () => {
      const output = await render(MarkdownText, { text: 'Hello <@123456789>' });
      expect(output.baseElement.textContent).toContain('@123456789');
    });

    it('should render multiple Discord mentions', async () => {
      const output = await render(MarkdownText, { text: '<@111> and <@222>' });
      const text = output.baseElement.textContent || '';
      expect(text).toContain('@111');
      expect(text).toContain('@222');
    });
  });

  describe('Prose Size Classes', () => {
    it('should apply default prose-base class', async () => {
      const output = await render(MarkdownText, { text: 'Test' });
      expect(output.baseElement.innerHTML).toContain('prose-base');
    });

    it('should apply prose-sm class', async () => {
      const output = await render(MarkdownText, { text: 'Test', size: 'prose-sm' });
      expect(output.baseElement.innerHTML).toContain('prose-sm');
    });

    it('should apply prose-lg class', async () => {
      const output = await render(MarkdownText, { text: 'Test', size: 'prose-lg' });
      expect(output.baseElement.innerHTML).toContain('prose-lg');
    });

    it('should apply prose-xl class', async () => {
      const output = await render(MarkdownText, { text: 'Test', size: 'prose-xl' });
      expect(output.baseElement.innerHTML).toContain('prose-xl');
    });

    it('should apply prose-2xl class', async () => {
      const output = await render(MarkdownText, { text: 'Test', size: 'prose-2xl' });
      expect(output.baseElement.innerHTML).toContain('prose-2xl');
    });
  });

  describe('HTML Sanitization', () => {
    it('should sanitize dangerous HTML by default', async () => {
      const output = await render(MarkdownText, {
        text: '<script>alert("xss")</script>',
      });
      expect(output.baseElement.innerHTML).not.toContain('<script>');
    });

    it('should sanitize onclick attributes', async () => {
      const output = await render(MarkdownText, {
        text: '<div onclick="alert(1)">Click me</div>',
      });
      expect(output.baseElement.innerHTML).not.toContain('onclick');
    });

    it('should allow safe HTML when noSanitize is true', async () => {
      const output = await render(MarkdownText, {
        text: '<strong>Bold</strong>',
        noSanitize: true,
      });
      expect(output.baseElement.innerHTML).toContain('<strong>Bold</strong>');
    });

    it('should still render script tags content when noSanitize is true', async () => {
      const output = await render(MarkdownText, {
        text: '<script>console.log("test")</script>',
        noSanitize: true,
      });
      // Script tags would be in the HTML when noSanitize is true
      expect(output.baseElement.innerHTML).toContain('script');
    });
  });

  describe('Complex Markdown', () => {
    it('should render mixed markdown with links and formatting', async () => {
      const output = await render(MarkdownText, {
        text: '**Bold** and *italic* with [link](https://example.com)',
      });
      expect(output.baseElement.innerHTML).toContain('<strong>Bold</strong>');
      expect(output.baseElement.innerHTML).toContain('<em>italic</em>');
      expect(output.baseElement.innerHTML).toContain('href="https://example.com"');
    });

    it('should render markdown with Discord time and mentions', async () => {
      const timestamp = 1761327563;
      const output = await render(MarkdownText, {
        text: `Meeting at <t:${timestamp}:F> with <@123456789>`,
      });
      expect(output.baseElement.innerHTML).toContain('<time');
      expect(output.baseElement.textContent).toContain('@123456789');
    });

    it('should trim whitespace from text', async () => {
      const output = await render(MarkdownText, {
        text: '   \n\n  Test  \n\n  ',
      });
      expect(output.baseElement.innerHTML).toContain('<p>Test</p>');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty text', async () => {
      const output = await render(MarkdownText, { text: '' });
      expect(output.baseElement).toBeDefined();
    });

    it('should handle text with only whitespace', async () => {
      const output = await render(MarkdownText, { text: '   \n\n  ' });
      expect(output.baseElement).toBeDefined();
    });

    it('should handle special characters', async () => {
      const output = await render(MarkdownText, {
        text: '< > & " \' / \\',
      });
      expect(output.baseElement.textContent).toContain('<');
      expect(output.baseElement.textContent).toContain('>');
    });

    it('should render blockquotes', async () => {
      const output = await render(MarkdownText, {
        text: '> This is a quote',
      });
      expect(output.baseElement.innerHTML).toContain('<blockquote>');
      expect(output.baseElement.textContent).toContain('This is a quote');
    });
  });
});
