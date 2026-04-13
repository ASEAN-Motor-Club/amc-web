import { PUBLIC_API_BASE } from '$env/static/public';
import type { Team } from './types';
import { apiClient } from './_api';

export const getTeams = async (signal: AbortSignal): Promise<Team[]> => {
  return apiClient(`${PUBLIC_API_BASE}/api/teams/`, signal, [], 'teams');
};
