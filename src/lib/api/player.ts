import { PUBLIC_API_BASE } from '$env/static/public';
import type { PlayerEventData } from './types';

// Modified type to allow undefined values for players who left
type PlayerEventDataWithDepartures = Record<string, PlayerEventData[string] | undefined>;

export const getPlayerRealtimePosition = (
  callback: (data: PlayerEventDataWithDepartures) => void,
): (() => void) => {
  const evt = new EventSource(`${PUBLIC_API_BASE}/api/player_positions/`);


  evt.onmessage = (e) => {
    const data: PlayerEventData = JSON.parse(e.data);
    callback(data);
  };

  return () => {
    evt.close();
  };
};
