import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { createRawSnippet, tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TruncateText from './TruncateText.svelte';

const LONG_TEXT =
  'This is a very long piece of text that is guaranteed to overflow the available container width and therefore trigger the truncation tooltip when measured';

describe('TruncateText', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders text in a span by default', async () => {
    const output = await render(TruncateText, { text: 'Hello' });
    await expect.element(page.getByText('Hello')).toBeVisible();
    expect(output.container.querySelector('span')?.tagName).toBe('SPAN');
  });

  it('renders an h1 when tag is h1', async () => {
    const output = await render(TruncateText, { text: 'Heading', tag: 'h1' });
    await expect.element(page.getByText('Heading')).toBeVisible();
    expect(output.container.querySelector('h1')?.tagName).toBe('H1');
  });

  it('renders children instead of the text prop', async () => {
    const children = createRawSnippet(() => ({ render: () => 'Custom' }));
    await render(TruncateText, { text: 'Ignored', children });
    await expect.element(page.getByText('Custom')).toBeVisible();
    expect(page.getByText('Ignored').all()).toHaveLength(0);
  });

  it('shows the tooltip when the content overflows', async () => {
    const observerMock: { callback: (() => void) | null } = { callback: null };
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(cb: () => void) {
          observerMock.callback = cb;
        }
        observe() {
          void 0;
        }
        unobserve() {
          void 0;
        }
        disconnect() {
          void 0;
        }
      },
    );

    const output = await render(TruncateText, { text: LONG_TEXT });
    await tick();

    const el = output.container.querySelector('span, h1') as HTMLElement;
    Object.defineProperty(el, 'scrollWidth', { value: 200, configurable: true });
    Object.defineProperty(el, 'clientWidth', { value: 50, configurable: true });

    observerMock.callback?.();
    await tick();

    el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    await tick();

    await expect.element(page.getByRole('tooltip')).toHaveTextContent(LONG_TEXT);
  });

  it('shows no tooltip for short text', async () => {
    await render(TruncateText, { text: 'Short' });
    await tick();
    expect(page.getByRole('tooltip').all()).toHaveLength(0);
  });
});
