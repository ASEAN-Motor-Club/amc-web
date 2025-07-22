import { PUBLIC_API_BASE } from '$env/static/public';
import type { PlayerEventData } from './types';

export const getPlayerRealtimePosition = (
  callback: (data: PlayerEventData) => void,
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
