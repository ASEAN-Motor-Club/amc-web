import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tick } from 'svelte';
import { PUBLIC_SEASON_NO, PUBLIC_SEASON_START_DATE } from '$env/static/public';
import { m } from '$messages';
import { format } from '$lib/date';
import ChampionshipPage from './ChampionshipPage.integration.svelte';

const { createTeamsQueryMock } = vi.hoisted(() => ({
  createTeamsQueryMock: vi.fn(),
}));

vi.mock('$lib/api/teams', () => ({
  createTeamsQuery: createTeamsQueryMock,
}));

const TEAMS = [
  {
    id: 1,
    name: 'Team Velocity',
    tag: 'VEL',
    description: 'Racing under the midnight sun.',
    logo: null,
    bg_color: '#101418',
    text_color: '#e5e7eb',
  },
  {
    id: 2,
    name: 'Team Drift Kings',
    tag: 'DRK',
    description: 'Sliding into first place.',
    logo: null,
    bg_color: '#1b1024',
    text_color: '#f3e8ff',
  },
];

const pendingQuery = {
  data: undefined,
  isPending: true,
  isError: false,
  isSuccess: false,
};

const loadedQuery = {
  data: TEAMS,
  isPending: false,
  isError: false,
  isSuccess: true,
};

const startDateText = () =>
  m['championship.starting_from']({
    date: format(new Date(PUBLIC_SEASON_START_DATE), m['format.dateFull']()),
  });

describe('championship page', () => {
  beforeEach(() => {
    createTeamsQueryMock.mockReset();
    createTeamsQueryMock.mockReturnValue(pendingQuery);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the season header and poster while teams are pending', async () => {
    const output = await render(ChampionshipPage);

    expect(document.title).toBe(
      m['championship.head']({ siteName: m.site_name_short(), seasonNo: PUBLIC_SEASON_NO }),
    );
    await expect
      .element(page.getByRole('heading', { level: 1 }))
      .toHaveTextContent(m['championship.title']());
    await expect
      .element(page.getByRole('heading', { level: 3 }))
      .toHaveTextContent(startDateText());
    await expect
      .element(page.getByRole('heading', { level: 2 }))
      .toHaveTextContent(m['championship.season']({ seasonNo: PUBLIC_SEASON_NO }));

    const poster = output.container.querySelector('img[alt="ASEAN Poster"]');
    if (!(poster instanceof HTMLImageElement)) {
      throw new Error('expected the season poster');
    }
    expect(poster.srcset).toContain('455w');
  });

  it('keeps the team list hidden until the teams query resolves', async () => {
    const output = await render(ChampionshipPage);

    expect(output.container.querySelectorAll('h4')).toHaveLength(0);
  });

  it('renders one section per team once the query resolves', async () => {
    createTeamsQueryMock.mockReturnValue(loadedQuery);
    const output = await render(ChampionshipPage);
    await tick();

    for (const team of TEAMS) {
      await expect
        .element(page.getByRole('heading', { level: 4, name: `[${team.tag}] ${team.name}` }))
        .toBeVisible();
      await expect.element(page.getByText(team.description)).toBeVisible();
    }

    expect(output.container.querySelectorAll('h4')).toHaveLength(TEAMS.length);
  });

  it('offers the event details and teams actions', async () => {
    await render(ChampionshipPage);

    await expect.element(page.getByText(m['championship.event_details']())).toBeVisible();
    await expect
      .element(page.getByRole('button', { name: m['championship.our_teams']() }))
      .toBeVisible();
  });
});
