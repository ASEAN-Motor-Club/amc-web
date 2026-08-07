import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient } from '@tanstack/svelte-query';
import { teamsQueryOptions } from './teams';
import type { Team } from './types';

const jsonResponse = (data: unknown) => ({
  ok: true,
  json: () => Promise.resolve(data),
});

const teams: Team[] = [
  {
    id: 1,
    name: 'Aurora Racing',
    tag: 'AUR',
    description: 'Endurance specialists.',
    logo: null,
    bg_color: '#101820',
    text_color: '#f2f2f2',
  },
  {
    id: 2,
    name: 'Borealis Motorsport',
    tag: 'BOR',
    description: 'Sprint specialists.',
    logo: 'https://cdn.example.test/bor.png',
    bg_color: '#0b3d91',
    text_color: '#ffffff',
  },
];

describe('teams query options', () => {
  const mockFetch = vi.fn();
  const originalFetch = global.fetch;
  let queryClient: QueryClient;

  beforeEach(() => {
    global.fetch = mockFetch;
    queryClient = new QueryClient();
  });

  afterEach(() => {
    queryClient.clear();
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('requests the teams endpoint', async () => {
    mockFetch.mockResolvedValue(jsonResponse([]));

    await queryClient.fetchQuery(teamsQueryOptions()());

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/teams/'),
      expect.anything(),
    );
  });

  it('returns the parsed teams without transforming them', async () => {
    mockFetch.mockResolvedValue(jsonResponse(teams));

    await expect(queryClient.fetchQuery(teamsQueryOptions()())).resolves.toEqual(teams);
  });

  it('serves fresh teams from cache across separate options factory calls', async () => {
    mockFetch.mockResolvedValue(jsonResponse(teams));

    await queryClient.ensureQueryData(teamsQueryOptions()());
    await queryClient.ensureQueryData(teamsQueryOptions()());

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(teamsQueryOptions()().queryKey)).toEqual(teams);
  });
});
