import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { m } from '$messages';
import MapLayout from './MapLayout.integration.svelte';
import type * as playerApi from '$lib/api/player';
import type * as housingApi from '$lib/api/housing';
import type * as deliveryApi from '$lib/api/delivery';

// The (map) layout reads the route from $app/state and pushes streams/queries that would
// connect to the production API. Pin the URL and stub every data source so the test is hermetic.
vi.mock('$app/state', () => {
  // Factory bodies are hoisted above imports, so the URL is built inline (and defensively,
  // since a malformed string would throw from the URL constructor).
  const url = (() => {
    try {
      return new URL('http://test/map');
    } catch {
      return new URL('http://localhost/');
    }
  })();
  return { page: { url, params: {}, route: { id: '/map' } } };
});

vi.mock('$lib/api/player', async (importOriginal) => {
  const actual = await importOriginal<typeof playerApi>();
  return {
    ...actual,
    createPlayerPositionsV2Stream: () => ({
      data: undefined,
      isPending: true,
      isError: false,
      error: undefined,
      status: 'pending',
    }),
  };
});

vi.mock('$lib/api/housing', async (importOriginal) => {
  const actual = await importOriginal<typeof housingApi>();
  return {
    ...actual,
    createHousingQuery: () => ({ data: undefined, isPending: true, isError: false }),
  };
});

vi.mock('$lib/api/delivery', async (importOriginal) => {
  const actual = await importOriginal<typeof deliveryApi>();
  return {
    ...actual,
    createDeliveryJobsQuery: () => ({ data: [], isPending: true, isError: false }),
  };
});

// The real map mounts WebGL + OlMap on load; stub it so the layout test asserts the scaffold,
// not map internals.
vi.mock('$lib/components/Map/Map/Map.svelte', async () => ({
  default: (await import('./MockMap.svelte')).default,
}));

describe('(map) layout', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.title = '';
  });

  it('renders the slotted page title and og:title', async () => {
    await render(MapLayout);

    expect(document.title).toBe(m['map.head']({ siteName: m.site_name_short() }));
    const ogTitle = document.querySelector('meta[name="og:title"]');
    expect(ogTitle?.getAttribute('content')).toBe(m['map.head']({ siteName: m.site_name_short() }));
  });

  it('mounts the map area and the side-menu collapsibles', async () => {
    await render(MapLayout);

    // The map component chunk loads on mount; the stub replaces it once resolved.
    await expect.element(page.getByTestId('map-stub')).toBeVisible();

    // Side menu always renders all four sections (they are anchor buttons, role link).
    await expect
      .element(page.getByRole('link', { name: m['map.side_menu.players']() }))
      .toBeVisible();
    await expect
      .element(page.getByRole('link', { name: m['map.side_menu.housing']() }))
      .toBeVisible();
    await expect.element(page.getByRole('link', { name: m['map.side_menu.jobs']() })).toBeVisible();
    await expect.element(page.getByRole('link', { name: m['map.side_menu.map']() })).toBeVisible();
  });
});
