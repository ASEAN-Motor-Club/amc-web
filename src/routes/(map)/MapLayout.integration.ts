import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { m } from '$messages';
import MapLayout from './MapLayout.integration.svelte';
import type * as playerApi from '$lib/api/player';
import type * as housingApi from '$lib/api/housing';
import type * as deliveryApi from '$lib/api/delivery';
import { deliveryPointsMap } from '$lib/data/deliveryPoint';
import { getMtLocale } from '$lib/utils/getMtLocale';

// The (map) layout derives its panels from the route in $app/state and pushes streams/queries
// that would hit the production API. The route and the data sources are mocked per-test so the
// suite is hermetic while covering every path the layout handles.

// vi.mock factories are hoisted above imports, so mutable state is built with vi.hoisted and the
// URL is constructed defensively (a malformed string would throw from the URL constructor).
const { mockPage, setPage } = vi.hoisted(() => {
  const makeUrl = (pathname: string) => {
    try {
      return new URL(`http://test${pathname}`);
    } catch {
      return new URL('http://test/map');
    }
  };
  const pageObj = {
    url: makeUrl('/map'),
    params: {} as Record<string, string>,
    route: { id: '/map' },
  };
  const setPage = (pathname: string, params: Record<string, string> = {}) => {
    pageObj.url = makeUrl(pathname);
    pageObj.params = params;
    pageObj.route = { id: pathname };
  };
  return { mockPage: pageObj, setPage };
});

vi.mock('$app/state', () => ({ page: mockPage }));

const { mockJobs, setJobs } = vi.hoisted(() => {
  // Mutated in place: the vi.mock factory closes over the `mockJobs` reference, so reassigning
  // the variable would leave the mock forever seeing the initial empty array.
  const jobs: unknown[] = [];
  const setJobs = (next: unknown[]) => {
    jobs.length = 0;
    jobs.push(...next);
  };
  return { mockJobs: jobs, setJobs };
});

vi.mock('$lib/api/player', async (importOriginal) => {
  const actual = await importOriginal<typeof playerApi>();
  return {
    ...actual,
    createPlayerPositionsV2Stream: () => ({
      data: undefined,
      isPending: false,
      isError: false,
      error: undefined,
      status: 'success',
    }),
  };
});

vi.mock('$lib/api/housing', async (importOriginal) => {
  const actual = await importOriginal<typeof housingApi>();
  return {
    ...actual,
    createHousingQuery: () => ({ data: undefined, isPending: false, isError: false }),
  };
});

vi.mock('$lib/api/delivery', async (importOriginal) => {
  const actual = await importOriginal<typeof deliveryApi>();
  return {
    ...actual,
    createDeliveryJobsQuery: () => ({ data: mockJobs, isPending: false, isError: false }),
    createDeliveryPointQuery: () => ({ data: undefined, isPending: false, isError: false }),
  };
});

// The real map mounts WebGL + OlMap on load; stub it so the layout test asserts the scaffold,
// not map internals.
vi.mock('$lib/components/Map/Map/Map.svelte', async () => ({
  default: (await import('./MockMap.svelte')).default,
}));

const sideMenu = () => page.getByRole('link', { name: m['map.side_menu.players']() });

describe('(map) layout', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.title = '';
    setJobs([]);
  });

  describe('/map (main map)', () => {
    it('renders the slotted page title and og:title', async () => {
      await render(MapLayout);

      expect(document.title).toBe(m['map.head']({ siteName: m.site_name_short() }));
      const ogTitle = document.querySelector('meta[name="og:title"]');
      expect(ogTitle?.getAttribute('content')).toBe(
        m['map.head']({ siteName: m.site_name_short() }),
      );
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
      await expect
        .element(page.getByRole('link', { name: m['map.side_menu.jobs']() }))
        .toBeVisible();
      await expect
        .element(page.getByRole('link', { name: m['map.side_menu.map']() }))
        .toBeVisible();
    });
  });

  describe('/housing', () => {
    it('opens the housing panel with its page title', async () => {
      setPage('/housing');

      await render(MapLayout, { props: { pageName: 'housing' } });

      expect(document.title).toBe(m['housing.head']({ siteName: m.site_name_short() }));
      await expect.element(page.getByRole('heading', { name: m['housing.title']() })).toBeVisible();
      await expect.element(page.getByPlaceholder(m['housing.search_placeholder']())).toBeVisible();
    });
  });

  describe('/players', () => {
    it('opens the players panel with its page title and empty state', async () => {
      setPage('/players');

      await render(MapLayout, { props: { pageName: 'players' } });

      expect(document.title).toBe(m['players.head']({ siteName: m.site_name_short() }));
      await expect.element(page.getByRole('heading', { name: m['players.title']() })).toBeVisible();
      await expect.element(page.getByText(m['players.no_players']())).toBeVisible();
    });
  });

  describe('/jobs', () => {
    it('opens the jobs panel with its empty state', async () => {
      setPage('/jobs');

      await render(MapLayout, { props: { pageName: 'jobs' } });

      await expect.element(page.getByRole('heading', { name: m['jobs.title']() })).toBeVisible();
      await expect.element(page.getByText(m['jobs.no_jobs']())).toBeVisible();
    });
  });

  describe('/jobs/[id]', () => {
    it('renders the selected job details once it resolves', async () => {
      setPage('/jobs/42', { id: '42' });
      // expired_at in the recent past so the detail view shows the expired copy regardless of
      // when the suite runs.
      const expiredAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      setJobs([
        {
          id: 42,
          name: 'Test Job',
          cargos: [],
          source_points: [],
          destination_points: [],
          deliveries: [],
          quantity_requested: 10,
          quantity_fulfilled: 7,
          requested_at: '2026-08-01T00:00:00Z',
          fulfilled_at: null,
          expired_at: expiredAt,
          bonus_multiplier: 1,
          completion_bonus: 500,
          description: '',
          fulfilled: false,
        },
      ]);

      await render(MapLayout, { props: { pageName: 'jobs/[id]' } });

      await expect.element(page.getByText('Test Job')).toBeVisible();
      await expect.element(page.getByText('7 / 10')).toBeVisible();
      await expect.element(page.getByText(m['jobs.expired']())).toBeVisible();
    });
  });

  describe('/deliveries', () => {
    it('keeps the side menu without opening a detail panel', async () => {
      setPage('/deliveries');

      await render(MapLayout, { props: { pageName: 'deliveries' } });

      // Deliveries without an id renders no panel; only the shared side menu stays.
      await expect.element(sideMenu()).toBeVisible();
      expect(page.getByRole('link', { name: m.view_on_map() }).query()).toBeNull();
    });
  });

  describe('/deliveries/[id]', () => {
    it('opens the delivery details panel for a known point', async () => {
      const firstPoint = deliveryPointsMap.values().next().value;
      const guid = firstPoint?.guid ?? 'unknown';

      setPage(`/deliveries/${guid}`, { id: guid });

      await render(MapLayout, { props: { pageName: 'deliveries/[id]' } });

      await expect.element(page.getByRole('link', { name: m.view_on_map() })).toBeVisible();
      if (firstPoint) {
        await expect
          .element(page.getByRole('heading', { level: 1, name: getMtLocale(firstPoint.name) }))
          .toBeVisible();
      }
    });
  });
});
