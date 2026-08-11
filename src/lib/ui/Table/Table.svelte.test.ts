import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import Harness from './Table.test.svelte';

describe('Table', () => {
  it('loading renders exactly skeletonCount x colCount skeleton cells', async () => {
    await render(Harness, { loading: true });
    expect(document.querySelectorAll('span.animate-pulse')).toHaveLength(12);
  });

  it('loading with grid-cols-[1fr_2fr] renders 2 columns per row', async () => {
    await render(Harness, { loading: true, gridClass: 'grid-cols-[1fr_2fr]' });
    expect(document.querySelectorAll('span.animate-pulse')).toHaveLength(6);
  });

  it('empty renders the emptyState content and nothing else', async () => {
    await render(Harness, { empty: true });
    await expect.element(page.getByText('empty-state-marker')).toBeVisible();
    expect(document.querySelectorAll('span.animate-pulse')).toHaveLength(0);
    expect(page.getByText('cell-a').all()).toHaveLength(0);
    expect(page.getByText('head-marker').all()).toHaveLength(0);
  });

  it('normal mode renders the head and the children content', async () => {
    await render(Harness, {});
    await expect.element(page.getByText('head-marker')).toBeVisible();
    await expect.element(page.getByText('cell-a')).toBeVisible();
    await expect.element(page.getByText('cell-d')).toBeVisible();
  });

  it('not loading renders no skeleton cells', async () => {
    await render(Harness, {});
    expect(document.querySelectorAll('span.animate-pulse')).toHaveLength(0);
  });
});
