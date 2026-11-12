import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { tick } from 'svelte';
import Harness from './Modal.test.svelte';
import { m } from '#messages';

describe('Modal', () => {
  it('renders nothing while closed', async () => {
    await render(Harness, { open: false });
    expect(page.getByText('Content').all()).toHaveLength(0);
  });

  it('renders the content when open', async () => {
    await render(Harness, { open: true });
    await expect.element(page.getByText('Content')).toBeVisible();
  });

  it('calls onClose when the backdrop is clicked', async () => {
    const onClose = vi.fn();
    await render(Harness, { open: true, onClose });
    document.querySelector<HTMLButtonElement>(`[aria-label="${m['action.close']()}"]`)?.click();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when Escape is pressed', async () => {
    const onClose = vi.fn();
    await render(Harness, { open: true, onClose });
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('exposes itself as a modal dialog', async () => {
    await render(Harness, { open: true });
    await expect.element(page.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('removes the content again once closed', async () => {
    const output = await render(Harness, { open: true });
    await expect.element(page.getByText('Content')).toBeVisible();
    await output.rerender({ open: false });
    // The close transition keeps the content mounted until the outro finishes.
    await expect.element(page.getByText('Content')).not.toBeInTheDocument();
  });

  it('locks page scroll while open and restores it on close', async () => {
    const output = await render(Harness, { open: true });
    await tick();
    expect(document.documentElement.style.overflowY).toBe('hidden');

    await output.rerender({ open: false });
    await tick();
    expect(document.documentElement.style.overflowY).toBe('');
  });
});
