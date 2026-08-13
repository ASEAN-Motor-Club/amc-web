import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PUBLIC_SEASON_START_DATE } from '$env/static/public';
import { m } from '$messages';
import { format } from '$lib/date';
import type * as championshipApi from '$lib/api/championship';
import ChampionshipDetailsPage from './ChampionshipDetailsPage.integration.svelte';

const { teamStandingsQueryMock, personalStandingsQueryMock } = vi.hoisted(() => ({
  teamStandingsQueryMock: vi.fn(),
  personalStandingsQueryMock: vi.fn(),
}));

vi.mock('$lib/api/championship', async (importOriginal) => ({
  ...(await importOriginal<typeof championshipApi>()),
  createTeamStandingsQuery: teamStandingsQueryMock,
  createPersonalStandingsQuery: personalStandingsQueryMock,
}));

const emptyStandingsQuery = {
  data: [],
  isPending: false,
  isError: false,
  isSuccess: true,
};

const startDateText = () =>
  m['championship.starting_from']({
    date: format(new Date(PUBLIC_SEASON_START_DATE), m['format.dateFull']()),
  });

describe('championship details page', () => {
  beforeEach(() => {
    teamStandingsQueryMock.mockReset().mockReturnValue(emptyStandingsQuery);
    personalStandingsQueryMock.mockReset().mockReturnValue(emptyStandingsQuery);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the title and the season start date', async () => {
    await render(ChampionshipDetailsPage);

    await expect
      .element(page.getByRole('heading', { level: 1 }))
      .toHaveTextContent(m['championship.title']());
    await expect
      .element(page.getByRole('heading', { level: 3 }))
      .toHaveTextContent(startDateText());
  });

  it('renders the standing and schedule sections', async () => {
    await render(ChampionshipDetailsPage);

    // getByRole name matching is substring-based, so pin the section headings by exact text.
    await expect
      .element(page.getByText(m['championship.standing'](), { exact: true }))
      .toBeVisible();
    await expect
      .element(page.getByText(m['championship.schedule'](), { exact: true }))
      .toBeVisible();
  });

  it('falls back to the empty state for standings without API data', async () => {
    await render(ChampionshipDetailsPage);

    // Both standing cards render the empty-state copy when their queries return no rows.
    await expect.element(page.getByText(m['championship.no_standing']()).first()).toBeVisible();
  });
});
