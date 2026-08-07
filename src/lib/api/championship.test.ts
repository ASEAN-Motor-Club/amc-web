import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryObserver } from '@tanstack/svelte-query';
import {
  eventQueryOptions,
  eventResultsQueryOptions,
  eventsQueryOptions,
  personalStandingsQueryOptions,
  teamStandingsQueryOptions,
} from './championship';

const jsonResponse = (data: unknown) => ({
  ok: true,
  json: () => Promise.resolve(data),
});

/** Standings live under the championship numbered one behind the season the UI talks about. */
const SEASON = 5;
const SEASON_CHAMPIONSHIP = 4;
const NEXT_SEASON = 6;
const NEXT_SEASON_CHAMPIONSHIP = 5;

const EVENT_ID = 42;

const teamStandingsUrl = new RegExp(`/api/championships/${SEASON_CHAMPIONSHIP}/team_standings/$`);
const nextTeamStandingsUrl = new RegExp(
  `/api/championships/${NEXT_SEASON_CHAMPIONSHIP}/team_standings/$`,
);
const personalStandingsUrl = new RegExp(
  `/api/championships/${SEASON_CHAMPIONSHIP}/personal_standings/$`,
);
const eventsUrl = /\/api\/scheduled_events\/$/;
const eventUrl = new RegExp(`/api/scheduled_events/${EVENT_ID}/$`);
const eventResultsUrl = new RegExp(`/api/scheduled_events/${EVENT_ID}/results/$`);

describe('championship query options', () => {
  const mockFetch = vi.fn();
  const originalFetch = global.fetch;
  let queryClient: QueryClient;

  /** Echoes the requested URL back as the payload so cache entries are distinguishable. */
  const echoRequestedUrl = () =>
    mockFetch.mockImplementation((url: string) => Promise.resolve(jsonResponse({ url })));

  beforeEach(() => {
    global.fetch = mockFetch;
    queryClient = new QueryClient();
  });

  afterEach(() => {
    queryClient.clear();
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('requests the championship one behind the season for team standings', async () => {
    mockFetch.mockResolvedValue(jsonResponse([]));

    await queryClient.fetchQuery(teamStandingsQueryOptions(() => ({ season: SEASON }))());

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(teamStandingsUrl),
      expect.anything(),
    );
  });

  it('requests the championship one behind the season for personal standings', async () => {
    mockFetch.mockResolvedValue(jsonResponse([]));

    await queryClient.fetchQuery(personalStandingsQueryOptions(() => ({ season: SEASON }))());

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(personalStandingsUrl),
      expect.anything(),
    );
  });

  it('keeps standings for different seasons in separate cache entries', async () => {
    echoRequestedUrl();

    await queryClient.ensureQueryData(teamStandingsQueryOptions(() => ({ season: SEASON }))());
    await queryClient.ensureQueryData(teamStandingsQueryOptions(() => ({ season: NEXT_SEASON }))());

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(
      queryClient.getQueryData(teamStandingsQueryOptions(() => ({ season: SEASON }))().queryKey),
    ).toEqual({
      url: expect.stringMatching(teamStandingsUrl),
    });
    expect(
      queryClient.getQueryData(
        teamStandingsQueryOptions(() => ({ season: NEXT_SEASON }))().queryKey,
      ),
    ).toEqual({
      url: expect.stringMatching(nextTeamStandingsUrl),
    });
  });

  it('serves a fresh season from cache instead of refetching', async () => {
    mockFetch.mockResolvedValue(jsonResponse([]));

    await queryClient.ensureQueryData(teamStandingsQueryOptions(() => ({ season: SEASON }))());
    await queryClient.ensureQueryData(teamStandingsQueryOptions(() => ({ season: SEASON }))());

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('keeps team and personal standings of one season in separate cache entries', async () => {
    echoRequestedUrl();

    await queryClient.ensureQueryData(teamStandingsQueryOptions(() => ({ season: SEASON }))());
    await queryClient.ensureQueryData(personalStandingsQueryOptions(() => ({ season: SEASON }))());

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(
      queryClient.getQueryData(teamStandingsQueryOptions(() => ({ season: SEASON }))().queryKey),
    ).toEqual({
      url: expect.stringMatching(teamStandingsUrl),
    });
    expect(
      queryClient.getQueryData(
        personalStandingsQueryOptions(() => ({ season: SEASON }))().queryKey,
      ),
    ).toEqual({
      url: expect.stringMatching(personalStandingsUrl),
    });
  });

  it('requests the scheduled events collection', async () => {
    mockFetch.mockResolvedValue(jsonResponse([]));

    await queryClient.fetchQuery(eventsQueryOptions()());

    expect(mockFetch).toHaveBeenCalledWith(expect.stringMatching(eventsUrl), expect.anything());
  });

  it('requests a single scheduled event by id', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}));

    await queryClient.fetchQuery(eventQueryOptions(() => ({ id: EVENT_ID }))());

    expect(mockFetch).toHaveBeenCalledWith(expect.stringMatching(eventUrl), expect.anything());
  });

  it('requests the results of a scheduled event by id', async () => {
    mockFetch.mockResolvedValue(jsonResponse([]));

    await queryClient.fetchQuery(eventResultsQueryOptions(() => ({ id: EVENT_ID }))());

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(eventResultsUrl),
      expect.anything(),
    );
  });

  it('parks the event query without fetching while the id is undefined', () => {
    const observer = new QueryObserver(queryClient, eventQueryOptions(() => ({ id: undefined }))());
    const unsubscribe = observer.subscribe(() => undefined);
    const result = observer.getCurrentResult();
    unsubscribe();

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.fetchStatus).toBe('idle');
    expect(result.status).toBe('pending');
  });

  it('parks the event results query without fetching while the id is undefined', () => {
    const observer = new QueryObserver(
      queryClient,
      eventResultsQueryOptions(() => ({ id: undefined }))(),
    );
    const unsubscribe = observer.subscribe(() => undefined);
    const result = observer.getCurrentResult();
    unsubscribe();

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.fetchStatus).toBe('idle');
    expect(result.status).toBe('pending');
  });

  it('caches an event and its results under keys that do not collide', async () => {
    echoRequestedUrl();

    await queryClient.ensureQueryData(eventQueryOptions(() => ({ id: EVENT_ID }))());
    await queryClient.ensureQueryData(eventResultsQueryOptions(() => ({ id: EVENT_ID }))());

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(
      queryClient.getQueryData(eventQueryOptions(() => ({ id: EVENT_ID }))().queryKey),
    ).toEqual({
      url: expect.stringMatching(eventUrl),
    });
    expect(
      queryClient.getQueryData(eventResultsQueryOptions(() => ({ id: EVENT_ID }))().queryKey),
    ).toEqual({
      url: expect.stringMatching(eventResultsUrl),
    });
  });
});
