import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AnkhrPage from './+page.svelte';

const FIRST_EPITHET = 'The Unyielding';

describe('ankhr page', () => {
  beforeEach(() => {
    // The epithet is chosen at random; pin it to the first entry for determinism.
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the tribute header with a known epithet', async () => {
    await render(AnkhrPage);

    await expect.element(page.getByRole('heading', { level: 1 })).toHaveTextContent('AnkhR');
    await expect.element(page.getByText(FIRST_EPITHET)).toBeVisible();
    expect(document.title).toBe(`AnkhR — ${FIRST_EPITHET}`);
  });

  it('renders the introduction and all four virtues', async () => {
    await render(AnkhrPage);

    await expect.element(page.getByRole('heading', { name: 'An Introduction' })).toBeVisible();
    for (const virtue of ['Fortitude', 'Loyalty', 'Wisdom', 'Valour']) {
      await expect.element(page.getByRole('heading', { level: 3, name: virtue })).toBeVisible();
    }
  });

  it('renders every deed of renown', async () => {
    const output = await render(AnkhrPage);

    const deeds = output.container.querySelectorAll('li');
    expect(deeds).toHaveLength(7);
  });

  it('renders the three testimonials with their authors', async () => {
    const output = await render(AnkhrPage);

    expect(output.container.querySelectorAll('blockquote')).toHaveLength(3);
    for (const author of ['A Fellow Driver', 'A Convoy Navigator', 'A Young Apprentice']) {
      // The footer is the only element carrying the em-dash signature.
      await expect.element(page.getByText(`— ${author},`)).toBeVisible();
    }
  });

  it('closes with the Still on the Road sign-off', async () => {
    await render(AnkhrPage);

    await expect.element(page.getByText('Still on the Road')).toBeVisible();
  });
});
