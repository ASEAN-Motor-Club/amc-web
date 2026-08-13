import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PUBLIC_DISCORD_LINK, PUBLIC_PATREON_LINK } from '$env/static/public';
import { m } from '$messages';
import type * as playerApi from '$lib/api/player';
import HomePage from './+page.svelte';

// The player-count stream would open a live connection to the production API; stub it so the
// suite stays hermetic. The page renders the "Live Server" label either way.
const { createPlayerCountStreamMock } = vi.hoisted(() => ({
  createPlayerCountStreamMock: vi.fn().mockReturnValue({
    data: undefined,
    isPending: false,
    isError: false,
    error: undefined,
    status: 'success',
  }),
}));

vi.mock('$lib/api/player', async (importOriginal) => ({
  ...(await importOriginal<typeof playerApi>()),
  createPlayerCountStream: createPlayerCountStreamMock,
}));

const FEATURES = [
  m['home.friendly_community'](),
  m['home.regular_events'](),
  m['home.ig_live_radio'](),
  m['home.ig_bot'](),
];

describe('home page', () => {
  beforeEach(() => {
    createPlayerCountStreamMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the site name as the page title and hero heading', async () => {
    await render(HomePage);

    expect(document.title).toBe(m.site_name());
    await expect.element(page.getByRole('heading', { level: 1 })).toHaveTextContent(m.site_name());
  });

  it('renders the background video and the scroll hint', async () => {
    const output = await render(HomePage);

    const video = output.container.querySelector('video');
    if (!(video instanceof HTMLVideoElement)) {
      throw new Error('expected the home page background video');
    }
    expect(video.getAttribute('src')).toContain('background_trailer');
    expect(video.loop).toBe(true);
    expect(video.muted).toBe(true);

    expect(output.container.querySelector('[class*="keyboard-arrow-down-rounded"]')).not.toBeNull();
  });

  it('renders all four feature pills', async () => {
    await render(HomePage);

    for (const feature of FEATURES) {
      await expect.element(page.getByText(feature)).toBeVisible();
    }
  });

  it('links to the map, Discord, Patreon, and radio', async () => {
    const output = await render(HomePage);

    // Hermeticity proof: the page must have consumed the mocked stream, not opened a live
    // connection to the production API.
    expect(createPlayerCountStreamMock).toHaveBeenCalledOnce();

    const mapLink = output.container.querySelector('a[href="/map"]');
    if (!(mapLink instanceof HTMLAnchorElement)) {
      throw new Error('expected the live-server link to /map');
    }
    // The player-count stream is mocked, so the no-count fallback label is shown.
    await expect.element(page.getByText(m['home.live_server_no_count']())).toBeVisible();

    await expect
      .element(page.getByRole('link', { name: m['home.join_discord']() }))
      .toHaveAttribute('href', PUBLIC_DISCORD_LINK);
    await expect
      .element(page.getByRole('link', { name: m['home.join_patreon']() }))
      .toHaveAttribute('href', PUBLIC_PATREON_LINK);
    await expect
      .element(page.getByRole('link', { name: m['home.listen_radio']() }))
      .toHaveAttribute('href', '/radio');

    await expect.element(page.getByTitle(m['home.iframe_discord']())).toBeInTheDocument();
  });
});
