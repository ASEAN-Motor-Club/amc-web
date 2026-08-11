import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { tick } from 'svelte';
import { prefersReducedMotion } from 'svelte/motion';
import Harness from './Select.test.svelte';

const optionA = () => page.getByRole('button', { name: 'Option A' });
const optionB = () => page.getByRole('button', { name: 'Option B' });

/** Opens the menu by clicking the select wrapper button (first button in DOM order). */
const openMenu = async (): Promise<void> => {
  page
    .getByRole('button')
    .first()
    .element()
    .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  await tick();
};

describe('Select', () => {
  beforeEach(() => {
    // The app stylesheet (UnoCSS) is not loaded in the test iframe, so the
    // `hidden` utility used by the closed menu has no effect. Restore just
    // that one rule so closed options behave as they do in the app.
    const style = document.createElement('style');
    style.textContent = '.hidden { display: none !important; }';
    document.head.append(style);

    // The Select shortens its slide transition to 0ms when the user prefers
    // reduced motion; emulate that so the menu opens/closes synchronously
    // instead of animating for the full 150ms.
    Object.defineProperty(prefersReducedMotion, 'current', {
      configurable: true,
      get: () => true,
    });
  });

  it('shows the placeholder when no option matches the value', async () => {
    await render(Harness, {});
    const input = page.getByRole('textbox');
    await expect.element(input).toHaveAttribute('placeholder', 'Pick one');
  });

  it('keeps the menu closed initially', async () => {
    await render(Harness, {});
    // The option buttons are hidden while the menu is closed, so they are not
    // exposed to role-based queries at all
    expect(optionA().all()).toHaveLength(0);
    expect(optionB().all()).toHaveLength(0);
  });

  it('opens the menu when the select is clicked', async () => {
    await render(Harness, {});
    await openMenu();
    await expect.element(optionA()).toBeVisible();
    await expect.element(optionB()).toBeVisible();
  });

  it('calls onChange with the selected id and closes the menu again', async () => {
    const onChange = vi.fn();
    await render(Harness, { onChange });
    await openMenu();

    optionA()
      .element()
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith('a');
    // The other option is no longer exposed once the menu has closed
    await tick();
    expect(optionB().all()).toHaveLength(0);
  });

  it('updates the displayed value after selecting an option', async () => {
    await render(Harness, {});
    await openMenu();

    optionB()
      .element()
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    await expect.element(page.getByRole('textbox')).toHaveValue('Option B');
  });
});
