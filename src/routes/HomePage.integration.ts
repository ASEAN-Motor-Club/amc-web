import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PUBLIC_DISCORD_LINK, PUBLIC_PATREON_LINK } from '$env/static/public';
import { m } from '$messages';
import HomePage from './+page.svelte';

const FEATURES = [
  m['home.friendly_community'](),
  m['home.regular_events'](),
  m['home.ig_live_radio'](),
  m['home.ig_bot'](),
];

describe('home page', () => {
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

    const mapLink = output.container.querySelector('a[href="/map"]');
    if (!(mapLink instanceof HTMLAnchorElement)) {
      throw new Error('expected the live-server link to /map');
    }
    // The player-count stream hits the real API and may or may not report a count;
    // the label always contains "Live Server" either way.
    expect(mapLink.textContent).toContain('Live Server');

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
