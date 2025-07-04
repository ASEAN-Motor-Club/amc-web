import { getLocationAtPoint } from '$lib/data/area';
import type { Vector2 } from '$lib/types';
import type { PlayerEventData } from '$lib/api/types';
import { reProjectPoint } from '$lib/ui/OlMap/utils';
import type { PointType } from './types';

export type PlayerData = {
  geometry: [number, number];
  name: string;
  pointType: PointType.Player;
  location: string;
  coord: Vector2;
};

let evt: EventSource | undefined;

self.onmessage = async (event: MessageEvent) => {
  if (event.data === 'start') {
    if (evt) return; // already started
    evt = new EventSource('https://server.aseanmotorclub.com/api/player_positions/');

    evt.onmessage = (e) => {
      const data: PlayerEventData = JSON.parse(e.data);
      const result = Object.entries(data).map(([name, coord]) => ({
        geometry: reProjectPoint([coord.x, coord.y]),
        name,
        coord,
        location: getLocationAtPoint(coord),
        pointType: 2,
      }));
      self.postMessage(result);
    };
  } else if (event.data === 'stop') {
    if (evt) {
      evt.close();
      evt = undefined;
    }
  }
};
