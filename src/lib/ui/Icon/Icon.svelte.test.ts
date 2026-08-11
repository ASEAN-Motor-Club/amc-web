import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import Icon from './Icon.svelte';

describe('Icon', () => {
  it('renders the icon class with the default md size', async () => {
    const output = await render(Icon, { class: 'i-material-symbols:home' });
    const icon = output.container.firstElementChild as HTMLElement;
    expect(icon.className).toContain('i-material-symbols:home');
    expect(icon.className).toContain('!text-[1.5rem]');
  });

  it.each([
    ['xs', '!text-[0.9rem]'],
    ['sm', '!text-[1rem]'],
    ['md', '!text-[1.5rem]'],
    ['lg', '!text-[2rem]'],
  ] as const)('maps size %s to its text class', async (size, expected) => {
    const output = await render(Icon, { class: 'x', size });
    const icon = output.container.firstElementChild as HTMLElement;
    expect(icon.className).toContain(expected);
  });

  it('passes through custom size strings unchanged', async () => {
    const output = await render(Icon, { class: 'x', size: '!text-xl' });
    const icon = output.container.firstElementChild as HTMLElement;
    expect(icon.className).toContain('!text-xl');
    expect(icon.className).not.toContain('!text-[1.5rem]');
  });

  it('exposes the title as an image label', async () => {
    await render(Icon, { class: 'x', title: 'Close panel' });
    const img = page.getByRole('img');
    await expect.element(img).toHaveAccessibleName('Close panel');
  });

  it('has no img role without a title', async () => {
    await render(Icon, { class: 'x' });
    expect(page.getByRole('img').all()).toHaveLength(0);
  });
});
