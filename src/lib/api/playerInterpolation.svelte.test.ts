import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tick } from 'svelte';
import { focusManager } from '@tanstack/svelte-query';
import { create, toBinary } from '@bufbuild/protobuf';
import {
  PlayerPositionSchema,
  PlayerPositionsSchema,
  type PlayerPosition,
  type PlayerPositions,
} from './proto/generated/player_positions_pb';
import { prefersReducedMotion } from 'svelte/motion';
import {
  createPlayerInterpolator,
  createInterpolatedPlayerPositionsStream,
  type InterpolatedPlayerPositions,
} from './playerInterpolation.svelte';

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

const msg = (t: bigint, players: PlayerPosition[]): PlayerPositions =>
  create(PlayerPositionsSchema, { timestampMs: t, players });

const position = (id: string, x: number, hidden = false): PlayerPosition =>
  create(PlayerPositionSchema, {
    uniqueId: id,
    playerName: id,
    x,
    y: 0,
    z: 0,
    hidden,
  });

const frame = (t: bigint, players: PlayerPosition[]): ArrayBuffer =>
  toBinary(PlayerPositionsSchema, create(PlayerPositionsSchema, { timestampMs: t, players }))
    .buffer as ArrayBuffer;

describe('playerInterpolation', () => {
  const originalWebSocket = window.WebSocket;
  /** Faked wall clock shared by performance.now(); rAF frames use the same values. */
  let clock = 0;
  /** Faked rAF: captured callbacks fire with chosen timestamps, in registration order. */
  let rafCallbacks: ((now: number) => void)[];
  let dispose: (() => void) | undefined;

  beforeEach(() => {
    FakeWebSocket.instances = [];
    rafCallbacks = [];
    clock = 0;
    window.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
    vi.stubGlobal('performance', { now: () => clock });
    vi.stubGlobal('requestAnimationFrame', (cb: (now: number) => void) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    dispose?.();
    dispose = undefined;
    window.WebSocket = originalWebSocket;
    focusManager.setFocused(undefined);
    vi.unstubAllGlobals();
    // Restore a possible test override of the media query.
    delete (Object.getOwnPropertyDescriptor(prefersReducedMotion, 'current') as PropertyDescriptor)
      ?.get;
  });

  /** Fires all pending rAF callbacks at `now` and drains callbacks they scheduled. */
  const runFrame = (now: number) => {
    clock = now;
    const queued = rafCallbacks;
    rafCallbacks = [];
    for (const cb of queued) cb(now);
  };

  /** Runs the stream inside an effect root, mirroring component initialization. */
  const mount = async (enabled = true) => {
    let stream!: InterpolatedPlayerPositions;
    dispose = $effect.root(() => {
      stream = createInterpolatedPlayerPositionsStream(() => ({ enabled }));
    });
    await tick();
    return stream;
  };

  const push = async (payload: ArrayBuffer) => {
    FakeWebSocket.live[0]?.onmessage?.(new MessageEvent('message', { data: payload }));
    await tick();
  };

  describe('createPlayerInterpolator', () => {
    it('returns undefined with no frames', () => {
      const interp = createPlayerInterpolator();
      expect(interp.tick(0)).toBeUndefined();
    });

    it('holds a lone frame as an uninterpolated passthrough', () => {
      const interp = createPlayerInterpolator();
      interp.push(msg(1000n, [position('a', 1)]));
      expect(interp.tick(500)?.players).toHaveLength(1);
      expect(interp.tick(500)?.players[0].x).toBe(1);
    });

    it('renders two snapshots behind in steady state: newest is never an endpoint', () => {
      const interp = createPlayerInterpolator();
      // Frames arriving on a 1s server cadence, wall clock advancing with them.
      interp.push(msg(1000n, [position('a', 0)]));
      clock = 1000;
      interp.push(msg(2000n, [position('a', 10)]));
      clock = 1500;
      interp.push(msg(3000n, [position('a', 20)]));

      // Mid-way through wall time, the render sits inside the 1000→2000 segment; the
      // newest snapshot (3000) is held back and the render timestamp trails it.
      const out = interp.tick(1500);
      expect(out?.players[0].x).toBe(5);
      expect(out?.timestampMs).toBe(1500n);
    });

    it('never interpolates beyond the newest received snapshot', () => {
      const interp = createPlayerInterpolator();
      interp.push(msg(1000n, [position('a', 0)]));
      interp.push(msg(2000n, [position('a', 10)]));
      interp.push(msg(3000n, [position('a', 20)]));

      // Long after the stream went quiet: clamped at the newest received position,
      // never extrapolated toward unseen coordinates.
      expect(interp.tick(1_000_000)?.players[0].x).toBe(20);
    });

    it('linearly interpolates between the two frames bracketing the render time', () => {
      const interp = createPlayerInterpolator();
      interp.push(msg(1000n, [position('a', 0)]));
      interp.push(msg(2000n, [position('a', 10)]));
      interp.push(msg(3000n, [position('a', 30)]));

      // Segment 1000→2000 anchored when its second endpoint arrived (clock 0): halfway
      // through the delta is halfway between the endpoints.
      expect(interp.tick(500)?.players[0].x).toBe(5);
      expect(interp.tick(250)?.players[0].x).toBe(2.5);
    });

    it('keeps the rendered position continuous when the window shifts', () => {
      const interp = createPlayerInterpolator();
      interp.push(msg(1000n, [position('a', 0)]));
      interp.push(msg(2000n, [position('a', 10)]));
      interp.push(msg(3000n, [position('a', 20)]));

      // t=999 renders just below segment end; crossing into the next segment must not
      // jump - the shift chains the clock from the exact segment end.
      const before = interp.tick(999);
      expect(before?.players[0].x).toBeCloseTo(9.99);
      const after = interp.tick(1000);
      expect(after?.players[0].x).toBe(10);
      expect(after?.timestampMs).toBe(2000n);
    });

    it('snaps teleports instead of sweeping across the map', () => {
      const interp = createPlayerInterpolator();
      // 100 m in 1 s = 360 km/h: above any vehicle, so the move snaps to the newest
      // snapshot on every frame instead of gliding through the whole segment.
      interp.push(msg(1000n, [position('a', 0)]));
      interp.push(msg(2000n, [position('a', 100)]));
      interp.push(msg(3000n, [position('a', 110)]));

      expect(interp.tick(500)?.players[0].x).toBe(100);
      expect(interp.tick(250)?.players[0].x).toBe(100);
    });

    it('interpolates at the threshold boundary', () => {
      const interp = createPlayerInterpolator();
      // 300 km/h ≈ 83.3 m over 1 s: exactly at the limit, still interpolated.
      interp.push(msg(1000n, [position('a', 0)]));
      interp.push(msg(2000n, [position('a', 83.3)]));
      interp.push(msg(3000n, [position('a', 166.6)]));

      expect(interp.tick(500)?.players[0].x).toBeCloseTo(41.65);
    });

    it('snaps joins, leaves and hidden toggles instead of interpolating them', () => {
      const interp = createPlayerInterpolator();
      interp.push(msg(1000n, [position('a', 0), position('gone', 5), position('hider', 7, true)]));
      interp.push(msg(2000n, [position('a', 10), position('new', 3), position('hider', 7, true)]));
      interp.push(msg(3000n, [position('a', 20), position('new', 4)]));

      const out = interp.tick(500);
      const byId = new Map((out?.players ?? []).map((p) => [p.uniqueId, p]));
      expect(byId.get('a')?.x).toBe(5);
      // Joined after the segment start: newest snapshot value, no glide from nowhere.
      expect(byId.get('new')?.x).toBe(3);
      // Left before the segment end: gone immediately, no fade toward stale coords.
      expect(byId.has('gone')).toBe(false);
      // Hidden both sides: rendered, but raw (its coords are withheld data).
      expect(byId.get('hider')?.x).toBe(7);
    });

    it('returns the identical object while the rendered state is unchanged', () => {
      const interp = createPlayerInterpolator();
      interp.push(msg(1000n, [position('a', 0)]));
      interp.push(msg(2000n, [position('a', 10)]));
      const first = interp.tick(100);
      expect(interp.tick(100)).toBe(first);
      // Alpha clamped at the segment end holds the same object too.
      expect(interp.tick(1_000_000)).toBe(interp.tick(1_000_001));
    });

    it('drops duplicate and reordered frames', () => {
      const interp = createPlayerInterpolator();
      interp.push(msg(1000n, [position('a', 0)]));
      clock = 1000;
      interp.push(msg(2000n, [position('a', 10)]));
      clock = 1200;
      interp.push(msg(2000n, [position('a', 99)]));
      interp.push(msg(1500n, [position('a', 99)]));
      clock = 2200;
      interp.push(msg(3000n, [position('a', 20)]));

      // Segment 1 plays out to its end, then the window chains into 2000→3000.
      expect(interp.tick(1999)?.players[0].x).toBeCloseTo(9.99);
      expect(interp.tick(2000)?.players[0].x).toBe(10);
      expect(interp.tick(2000)?.timestampMs).toBe(2000n);
      // Midpoint of 2000→3000 proves the poisoned frames never entered the buffer.
      expect(interp.tick(2500)?.players[0].x).toBe(15);
      expect(interp.tick(2500)?.timestampMs).toBe(2500n);
      expect(interp.tick(3000)?.players[0].x).toBe(20);
    });

    it('flushes stale frames when the server clock jumps backwards', () => {
      const interp = createPlayerInterpolator();
      interp.push(msg(10_000n, [position('a', 1)]));
      interp.push(msg(11_000n, [position('a', 2)]));
      interp.push(msg(500n, [position('a', 3)]));
      // The stale buffer is discarded wholesale; the fresh timeline renders immediately.
      expect(interp.tick(1)?.players[0].x).toBe(3);
    });

    it('ignores frames without a usable snapshot timestamp', () => {
      const interp = createPlayerInterpolator();
      interp.push(create(PlayerPositionsSchema, { players: [position('a', 1)] }));
      interp.push(msg(0n, [position('a', 2)]));
      interp.push(msg(-5n, [position('a', 3)]));
      expect(interp.tick(0)).toBeUndefined();
    });

    it('reset clears the buffer', () => {
      const interp = createPlayerInterpolator();
      interp.push(msg(1000n, [position('a', 0)]));
      interp.reset();
      expect(interp.tick(0)).toBeUndefined();
    });
  });

  describe('createInterpolatedPlayerPositionsStream', () => {
    it('renders two snapshots behind: the newest frame is held back', async () => {
      const stream = await mount();
      await push(frame(1000n, [position('1', 0)]));
      await push(frame(2000n, [position('1', 10)]));
      await push(frame(3000n, [position('1', 20)]));

      // A held frame still counts as received, so the clock starts (status success).
      expect(rafCallbacks.length).toBeGreaterThan(0);
      runFrame(500);

      expect(stream.status).toBe('success');
      expect(stream.data?.players[0].x).toBe(5);
      expect(stream.snapshot?.timestampMs).toBe(3000n);
    });

    it('advances the interpolation on subsequent rAF frames', async () => {
      const stream = await mount();
      await push(frame(1000n, [position('1', 0)]));
      await push(frame(2000n, [position('1', 10)]));
      await push(frame(3000n, [position('1', 20)]));

      runFrame(250);
      expect(stream.data?.players[0].x).toBe(2.5);
      runFrame(750);
      expect(stream.data?.players[0].x).toBe(7.5);
    });

    it('clears rendered data when the stream is disabled', async () => {
      const stream = await mount(true);
      await push(frame(1000n, [position('1', 0)]));
      await push(frame(2000n, [position('1', 10)]));
      runFrame(500);
      expect(stream.data?.players[0].x).toBe(5);

      dispose?.();
      dispose = undefined;
      let next!: InterpolatedPlayerPositions;
      dispose = $effect.root(() => {
        next = createInterpolatedPlayerPositionsStream(() => ({ enabled: false }));
      });
      await tick();

      expect(next.status).toBe('pending');
      expect(next.data).toBeUndefined();
    });

    it('renders raw snapshots without a clock under reduced motion', async () => {
      Object.defineProperty(prefersReducedMotion, 'current', {
        configurable: true,
        get: () => true,
      });
      const stream = await mount();
      await push(frame(1000n, [position('1', 7)]));

      expect(stream.data?.players[0].x).toBe(7);
      expect(rafCallbacks).toHaveLength(0);
    });

    it('renders raw snapshots when the backend sends no timestamp', async () => {
      const stream = await mount();
      // Zero timestampMs: the interpolator bypass, not the interpolation path.
      await push(frame(0n, [position('1', 7)]));

      expect(stream.data?.players[0].x).toBe(7);
    });
  });
});
