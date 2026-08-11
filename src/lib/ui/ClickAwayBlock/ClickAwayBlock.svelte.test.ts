import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { tick } from 'svelte';
import Harness from './ClickAwayBlock.test.svelte';

describe('ClickAwayBlock', () => {
  const clickButton = (name: 'inside' | 'outside') => {
    (page.getByRole('button', { name }).element() as HTMLElement).click();
  };

  it('never calls onClickAway while inactive', async () => {
    const onClickAway = vi.fn();
    await render(Harness, { active: false, onClickAway });

    clickButton('inside');
    clickButton('outside');
    await tick();

    expect(onClickAway).not.toHaveBeenCalled();
  });

  it('does not call onClickAway when clicking inside while active', async () => {
    const onClickAway = vi.fn();
    await render(Harness, { active: true, onClickAway });

    clickButton('inside');
    await tick();

    expect(onClickAway).not.toHaveBeenCalled();
  });

  it('calls onClickAway exactly once when clicking outside while active', async () => {
    const onClickAway = vi.fn();
    await render(Harness, { active: true, onClickAway });

    clickButton('outside');
    await tick();

    expect(onClickAway).toHaveBeenCalledTimes(1);
  });

  it('ignores clicks on additionalElements and reacts when they are removed', async () => {
    const onClickAway = vi.fn();
    const output = await render(Harness, { active: true, onClickAway });
    const outside = page.getByRole('button', { name: 'outside' }).element() as HTMLElement;

    // While the outside button is listed, clicks on it do not count as away.
    await output.rerender({ active: true, onClickAway, additionalElements: [outside] });
    clickButton('outside');
    await tick();
    expect(onClickAway).not.toHaveBeenCalled();

    // Once removed from the list, the same click does count as away.
    await output.rerender({ active: true, onClickAway, additionalElements: [] });
    clickButton('outside');
    await tick();
    expect(onClickAway).toHaveBeenCalledTimes(1);
  });
});
