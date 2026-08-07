import { PUBLIC_API_BASE } from '$env/static/public';
import { fromBinary } from '@bufbuild/protobuf';
import { PlayerPositionsSchema, type PlayerPositions } from './proto/generated/player_positions_pb';
import type { PlayerEventData } from './types';
import type { QueryParam } from './_api';
import { createEventSourceStream, createWebSocketStream } from './_stream.svelte';

export interface PlayerStreamInput {
  /** Gate for the connection; defaults to open. */
  enabled?: boolean;
}

export const createPlayerCountStream = (input?: QueryParam<PlayerStreamInput>) =>
  createEventSourceStream<number>(() => ({
    url: `${PUBLIC_API_BASE}/api/player_count/`,
    enabled: input?.().enabled,
  }));

export const createPlayerPositionsStream = (input?: QueryParam<PlayerStreamInput>) =>
  createEventSourceStream<PlayerEventData>(() => ({
    url: `${PUBLIC_API_BASE}/api/player_positions/`,
    enabled: input?.().enabled,
  }));

export const createPlayerPositionsV2Stream = (input?: QueryParam<PlayerStreamInput>) =>
  createWebSocketStream<PlayerPositions>(() => ({
    url: `${PUBLIC_API_BASE}/api/player_positions_b/`,
    decode: (frame) => fromBinary(PlayerPositionsSchema, new Uint8Array(frame)),
    enabled: input?.().enabled,
  }));
