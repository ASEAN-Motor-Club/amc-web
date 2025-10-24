import { PUBLIC_API_BASE } from '$env/static/public';
import type { PlayerEventData } from './types';
import { startVisibilityAwareEventSource } from './_api';

export const getPlayerRealtimePosition = (
  callback: (data: PlayerEventData) => void,
  abortSignal: AbortSignal,
) => {
  startVisibilityAwareEventSource(
    'Player position',
    `${PUBLIC_API_BASE}/api/player_positions/`,
    (data: unknown) => {
      const typedData = data as PlayerEventData;
      callback(typedData);
    },
    undefined,
    abortSignal,
  );
};
