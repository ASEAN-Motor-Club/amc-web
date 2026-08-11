import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import Button from './Button.svelte';

const text = (value: string) => createRawSnippet(() => ({ render: () => value }));

describe('Button', () => {
  it('renders its children with a button role and default type', async () => {
    await render(Button, { children: text('Save') });
    const button = page.getByRole('button');
    await expect.element(button).toHaveTextContent('Save');
    await expect.element(button).toHaveAttribute('type', 'button');
  });

  it('fires onClick on click', async () => {
    const onClick = vi.fn();
    await render(Button, { children: text('Go'), onClick });
    await page.getByRole('button').click();
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders a disabled button when disabled', async () => {
    await render(Button, { children: text('Go'), disabled: true });
    await expect.element(page.getByRole('button')).toHaveAttribute('disabled');
  });

  it('renders as an anchor with href when tag is "a"', async () => {
    await render(Button, { children: text('Link'), tag: 'a', href: '/map' });
    const link = page.getByRole('link');
    await expect.element(link).toHaveAttribute('href', '/map');
    await expect.element(link).toHaveTextContent('Link');
  });

  it('renders prepend and append icon snippets', async () => {
    await render(Button, {
      children: text('Label'),
      prependIcon: text('PRE'),
      appendIcon: text('APP'),
    });
    const button = page.getByRole('button');
    await expect.element(button).toHaveTextContent(/PRE\s+Label\s+APP/);
  });
});
