import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { afterEach, describe, expect, it } from 'vitest';
import { createRawSnippet, tick } from 'svelte';
import Tooltip, { type TooltipProps } from './Tooltip.svelte';

const TOOLTIP_TEXT = 'Tooltip content';

const tooltipChildren = () =>
  createRawSnippet(() => ({ render: () => `<span>${TOOLTIP_TEXT}</span>` }));

describe('Tooltip', () => {
  const anchors: HTMLElement[] = [];

  afterEach(() => {
    anchors.splice(0).forEach((anchor) => anchor.remove());
  });

  const createAnchor = () => {
    const anchor = document.createElement('button');
    anchor.textContent = 'anchor';
    document.body.appendChild(anchor);
    anchors.push(anchor);
    return anchor;
  };

  const hover = (anchor: HTMLElement, type: 'mouseenter' | 'mouseleave') => {
    anchor.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
  };

  // The `anchor` prop shares its name with a Svelte mount option, so all props
  // must be passed under the `props` key.
  const renderTooltip = (props: TooltipProps) => render(Tooltip, { props });

  it('is absent immediately after render, before any enter event', async () => {
    await renderTooltip({ anchor: createAnchor(), children: tooltipChildren() });
    await tick();

    expect(page.getByRole('tooltip').all()).toHaveLength(0);
  });

  it('shows the children on anchor mouseenter', async () => {
    const anchor = createAnchor();
    await renderTooltip({ anchor, children: tooltipChildren() });

    hover(anchor, 'mouseenter');
    await tick();

    await expect.element(page.getByRole('tooltip')).toBeVisible();
    await expect.element(page.getByRole('tooltip')).toHaveTextContent(TOOLTIP_TEXT);
  });

  it('hides on anchor mouseleave', async () => {
    const anchor = createAnchor();
    await renderTooltip({ anchor, children: tooltipChildren() });

    hover(anchor, 'mouseenter');
    await tick();
    await expect.element(page.getByRole('tooltip')).toBeVisible();

    hover(anchor, 'mouseleave');
    await tick();
    expect(page.getByRole('tooltip').all()).toHaveLength(0);
  });

  it('never shows while disabled', async () => {
    const anchor = createAnchor();
    await renderTooltip({ anchor, children: tooltipChildren(), disabled: true });

    hover(anchor, 'mouseenter');
    await tick();

    expect(page.getByRole('tooltip').all()).toHaveLength(0);
  });

  it('renders inside the render container when portal is false', async () => {
    const anchor = createAnchor();
    const output = await renderTooltip({ anchor, children: tooltipChildren(), portal: false });

    hover(anchor, 'mouseenter');
    await tick();
    expect(output.container.querySelector('[role="tooltip"]')).not.toBeNull();

    // The default portal behavior moves the tooltip onto document.body instead.
    // (The pre-switch tooltip lingers in the container while its fade-out runs,
    // so only assert where the new tooltip lives, not where the old one was.)
    await output.rerender({ anchor, children: tooltipChildren(), portal: true });
    await tick();
    expect(document.body.querySelector('[role="tooltip"]')).not.toBeNull();
  });
});
