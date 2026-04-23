import { PUBLIC_API_BASE } from '$env/static/public';
import { fromBinary } from '@bufbuild/protobuf';
import { PlayerPositionsSchema, type PlayerPositions } from './proto/generated/player_positions_pb';
import type { PlayerEventData } from './types';
import { startVisibilityAwareEventSource, startVisibilityAwareWebSocket } from './_api';

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

export const getPlayerCount = (callback: (count: number) => void, abortSignal: AbortSignal) => {
  startVisibilityAwareEventSource(
    'Player count',
    `${PUBLIC_API_BASE}/api/player_count/`,
    (data: number) => {
      callback(data);
    },
    undefined,
    abortSignal,
  );
};

export const getPlayerRealtimePositionV2 = (
  callback: (data: PlayerPositions) => void,
  abortSignal: AbortSignal,
) => {
  startVisibilityAwareWebSocket(
    'Player position V2',
    `${PUBLIC_API_BASE}/api/player_positions_b/`,
    (data: ArrayBuffer) => {
      try {
        callback(fromBinary(PlayerPositionsSchema, new Uint8Array(data)));
      } catch (error) {
        console.error('Player position V2 decoding error:', error);
      }
    },
    undefined,
    abortSignal,
  );
};
