import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { tick } from 'svelte';
import { focusManager } from '@tanstack/svelte-query';
import { create, toBinary } from '@bufbuild/protobuf';
import { PlayerPositionsSchema, VehicleKey } from './proto/generated/player_positions_pb';
import type { StreamResult } from './_stream.svelte';
import {
  createPlayerCountStream,
  createPlayerPositionsStream,
  createPlayerPositionsV2Stream,
} from './player';

class FakeEventSource {
  static instances: FakeEventSource[] = [];

  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  closed = false;

  constructor(readonly url: string) {
    FakeEventSource.instances.push(this);
  }

  close() {
    this.closed = true;
  }

  static get live() {
    return FakeEventSource.instances.filter((instance) => !instance.closed);
  }
}

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];

  onmessage: ((event: MessageEvent<ArrayBuffer>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  binaryType = '';
  closed = false;

  constructor(
    readonly url: string,
    readonly protocols: string[],
  ) {
    FakeWebSocket.instances.push(this);
  }

  close() {
    this.closed = true;
  }

  static get live() {
    return FakeWebSocket.instances.filter((instance) => !instance.closed);
  }
}

const PLAYER_COUNT = 128;

const SAMPLE_POSITION = {
  uniqueId: '76561198000000042',
  playerName: 'Tester',
  x: 1234.5,
  y: -678.25,
  z: 42.125,
};

const SAMPLE_EVENT_PLAYER = {
  x: 1,
  y: 2,
  z: 3,
  vehicle_key: 'VEHICLE_KEY_TUSCAN',
  unique_id: SAMPLE_POSITION.uniqueId,
};

describe('player streams', () => {
  const originalEventSource = window.EventSource;
  const originalWebSocket = window.WebSocket;
  let dispose: (() => void) | undefined;

  beforeEach(() => {
    FakeEventSource.instances = [];
    FakeWebSocket.instances = [];
    window.EventSource = FakeEventSource as unknown as typeof EventSource;
    window.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
  });

  afterEach(() => {
    dispose?.();
    dispose = undefined;
    window.EventSource = originalEventSource;
    window.WebSocket = originalWebSocket;
    focusManager.setFocused(undefined);
  });

  /**
   * Runs the stream inside an effect root so the test drives the same lifecycle a component would,
   * without needing a harness component.
   */
  const mount = async <TData>(open: () => StreamResult<TData>) => {
    let stream!: StreamResult<TData>;
    dispose = $effect.root(() => {
      stream = open();
    });
    await tick();
    return stream;
  };

  const pushJson = async (payload: unknown) => {
    FakeEventSource.live[0]?.onmessage?.(
      new MessageEvent('message', { data: JSON.stringify(payload) }),
    );
    await tick();
  };

  it('exposes the pushed player count from the player_count endpoint', async () => {
    const stream = await mount(() => createPlayerCountStream());

    expect(FakeEventSource.live).toHaveLength(1);
    expect(FakeEventSource.live[0].url).toEqual(expect.stringContaining('/api/player_count/'));
    expect(stream.data).toBeUndefined();

    await pushJson(PLAYER_COUNT);

    expect(stream.data).toBe(PLAYER_COUNT);
    expect(stream.status).toBe('success');
  });

  it('exposes the pushed player map from the player_positions endpoint', async () => {
    const stream = await mount(() => createPlayerPositionsStream());

    expect(FakeEventSource.live).toHaveLength(1);
    expect(FakeEventSource.live[0].url).toEqual(expect.stringContaining('/api/player_positions/'));

    await pushJson({ [SAMPLE_EVENT_PLAYER.unique_id]: SAMPLE_EVENT_PLAYER });

    expect(stream.data?.[SAMPLE_EVENT_PLAYER.unique_id]).toEqual(SAMPLE_EVENT_PLAYER);
  });

  it('opens a protobuf socket against the player_positions_b endpoint', async () => {
    await mount(() => createPlayerPositionsV2Stream());

    expect(FakeEventSource.live).toHaveLength(0);
    expect(FakeWebSocket.live).toHaveLength(1);
    expect(FakeWebSocket.live[0].url).toEqual(expect.stringContaining('/api/player_positions_b/'));
    expect(FakeWebSocket.live[0].binaryType).toBe('arraybuffer');
  });

  it('decodes a binary protobuf frame into player positions', async () => {
    const stream = await mount(() => createPlayerPositionsV2Stream());
    const message = create(PlayerPositionsSchema, {
      players: [
        {
          ...SAMPLE_POSITION,
          vehicleKey: { case: 'vehicleKeyEnum', value: VehicleKey.VEHICLE_KEY_TUSCAN },
        },
      ],
    });

    const frame = toBinary(PlayerPositionsSchema, message);
    FakeWebSocket.live[0].onmessage?.(new MessageEvent('message', { data: frame.buffer }));
    await tick();

    expect(stream.error).toBeUndefined();
    expect(stream.status).toBe('success');
    expect(stream.data?.players).toHaveLength(1);
    expect(stream.data?.players[0]).toMatchObject(SAMPLE_POSITION);
    expect(stream.data?.players[0].vehicleKey).toEqual({
      case: 'vehicleKeyEnum',
      value: VehicleKey.VEHICLE_KEY_TUSCAN,
    });
  });

  it('opens no socket while the positions stream is disabled', async () => {
    const stream = await mount(() => createPlayerPositionsV2Stream(() => ({ enabled: false })));

    expect(FakeWebSocket.live).toHaveLength(0);
    expect(stream.status).toBe('pending');
  });
});
