import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PUBLIC_DISCORD_EVENT_BASE } from '$env/static/public';
import { m } from '$messages';
import ChampionshipResultPage from './ChampionshipResultPage.integration.svelte';

const { eventQueryMock, eventResultsQueryMock } = vi.hoisted(() => ({
  eventQueryMock: vi.fn(),
  eventResultsQueryMock: vi.fn(),
}));

vi.mock('$app/state', () => {
  let url: URL;
  try {
    url = new URL('http://test/championship/result/5');
  } catch {
    throw new Error('championship result test url must be absolute');
  }
  return {
    page: {
      url,
      params: { id: '5' },
      route: { id: '/championship/result/[id]' },
    },
  };
});

vi.mock('$lib/api/championship', () => ({
  createEventQuery: eventQueryMock,
  createEventResultsQuery: eventResultsQueryMock,
}));

const EVENT = {
  id: 5,
  name: 'AMC Cup Season 2 Round 1',
  start_time: '2025-07-26T20:00:00+07:00',
  end_time: '2025-07-26T22:00:00+07:00',
  discord_event_id: '42',
  race_setup: 0,
  description: '',
  time_trial: false,
};

const RESULT_KEPT = {
  character: {
    id: 1,
    name: 'Achara Thongchai',
    player_id: 'p1',
    driver_level: 1,
    bus_level: 1,
    taxi_level: 1,
    police_level: 1,
    truck_level: 1,
    wrecker_level: null,
    racer_level: 1,
  },
  net_time: 95000,
  championship_point: null,
  finished: true,
  laps: 10,
  section_index: 0,
  first_section_total_time_seconds: null,
  last_section_total_time_seconds: 95000,
};

const RESULT_FILTERED = {
  ...RESULT_KEPT,
  character: { ...RESULT_KEPT.character, id: 2, name: 'Hideki Sato' },
  section_index: -1,
};

const pendingQuery = {
  data: undefined,
  isPending: true,
  isError: false,
  isSuccess: false,
};

const loadedEventQuery = {
  data: EVENT,
  isPending: false,
  isError: false,
  isSuccess: true,
};

const loadedResultsQuery = {
  data: [RESULT_KEPT, RESULT_FILTERED],
  isPending: false,
  isError: false,
  isSuccess: true,
};

const errorQuery = {
  data: undefined,
  isPending: false,
  isError: true,
  isSuccess: false,
};

describe('championship result page', () => {
  beforeEach(() => {
    eventQueryMock.mockReset().mockReturnValue(pendingQuery);
    eventResultsQueryMock.mockReset().mockReturnValue(pendingQuery);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the fallback title and a loading skeleton while the queries are pending', async () => {
    const output = await render(ChampionshipResultPage);

    expect(document.title).toBe(m['championship.results.head']({ siteName: m.site_name_short() }));
    expect(output.container.querySelector('.animate-pulse')).not.toBeNull();

    const moreInfo = output.container.querySelector('a');
    if (!(moreInfo instanceof HTMLAnchorElement)) {
      throw new Error('expected the more-info link');
    }
    // On an <a> element Svelte renders the disabled prop as a string attribute.
    expect(moreInfo.getAttribute('disabled')).toBe('true');
  });

  it('renders the event and its filtered results once loaded', async () => {
    eventQueryMock.mockReturnValue(loadedEventQuery);
    eventResultsQueryMock.mockReturnValue(loadedResultsQuery);
    const output = await render(ChampionshipResultPage);

    expect(document.title).toBe(
      m['championship.results.head_loaded']({
        name: EVENT.name,
        siteName: m.site_name_short(),
      }),
    );
    await expect.element(page.getByRole('heading', { level: 1 })).toHaveTextContent(EVENT.name);
    await expect.element(page.getByText(RESULT_KEPT.character.name)).toBeVisible();

    // Results with a section_index of -1 are filtered out before rendering.
    expect(output.container.textContent).not.toContain(RESULT_FILTERED.character.name);

    const moreInfo = output.container.querySelector('a');
    if (!(moreInfo instanceof HTMLAnchorElement)) {
      throw new Error('expected the more-info link');
    }
    expect(moreInfo.href).toBe(`${PUBLIC_DISCORD_EVENT_BASE}/${EVENT.discord_event_id}`);
    expect(moreInfo.getAttribute('disabled')).toBe('false');
  });

  it('opens the error modal when the event queries fail', async () => {
    eventQueryMock.mockReturnValue(errorQuery);
    eventResultsQueryMock.mockReturnValue(errorQuery);
    await render(ChampionshipResultPage);

    await expect
      .element(page.getByText(m['championship.results.cannot_load.title']()))
      .toBeVisible();
    await expect
      .element(page.getByText(m['championship.results.cannot_load.desc']()))
      .toBeVisible();
  });
});
