import { prefersReducedMotion } from 'svelte/motion';
import { create } from '@bufbuild/protobuf';
import {
  PlayerPositionSchema,
  PlayerPositionsSchema,
  type PlayerPosition,
  type PlayerPositions,
} from './proto/generated/player_positions_pb';
import { createPlayerPositionsV2Stream, type PlayerStreamInput } from './player';
import { dist2DSq } from '$lib/utils/math/vectors';
import type { QueryParam } from './_api';
import type { StreamResult } from './_stream.svelte';

/**
 * Smooth player rendering: the stream renders two snapshots behind the newest received
 * frame, so every played segment has a complete delta to interpolate over. Segment
 * durations come from the protobuf `timestampMs` deltas, positions are linearly
 * interpolated on a rAF clock, and everything else (roster, vehicle, hidden flag) is
 * the newer snapshot's value.
 */

interface Frame {
  /** Snapshot epoch ms (protobuf timestampMs). */
  t: number;
  players: PlayerPosition[];
}

/** Two frames being interpolated plus the newest one held back. */
const BUFFERED_FRAMES = 3;

/** No game vehicle reaches this; a faster implied displacement is a teleport/respawn. */
const MAX_INTERPOLATED_SPEED_KMH = 300;

export interface PlayerInterpolator {
  /** Feeds one decoded snapshot; duplicates and reordered frames are dropped. */
  push: (msg: PlayerPositions) => void;
  /** Drops buffered frames (stream disabled or reset). */
  reset: () => void;
  /**
   * Advances the render clock to `nowMs` (a rAF timestamp) and returns the interpolated
   * snapshot. Returns the same object while the rendered state is unchanged (hold), so
   * consumers can skip no-op frames.
   */
  tick: (nowMs: number) => PlayerPositions | undefined;
}

export const createPlayerInterpolator = (): PlayerInterpolator => {
  /**
   * Ascending snapshot window: [segmentStart, segmentEnd, holdback?]. The newest frame
   * is held back until the segment before it has played out, so every played segment
   * has a complete delta. Bursts beyond one holdback collapse to the latest frame.
   */
  let frames: Frame[] = [];
  /**
   * rAF-clock time at which the playing segment started (alpha 0). Anchored when the
   * segment's second endpoint arrives; a window slide chains it by the played delta,
   * so shifts stay continuous and the timeline stays derived from protobuf timestamps.
   * rAF timestamps share the performance.now() origin.
   */
  let anchor = 0;
  let lastEmit: { frames: Frame[]; alpha: number; out: PlayerPositions } | undefined;

  const interpolate = (a: Frame, b: Frame, alpha: number): PlayerPositions => {
    if (a === b) {
      return create(PlayerPositionsSchema, {
        players: b.players,
        timestampMs: BigInt(Math.round(b.t)),
      });
    }
    const players = b.players.map((p) => {
      // Joins, leaves and hidden toggles snap to the newest snapshot; only real
      // movement (present and visible in both) interpolates. Hidden coordinates are
      // withheld (0,0) and must never be interpolated from or to.
      const prev = a.players.find((q) => q.uniqueId === p.uniqueId);
      if (!prev || prev.hidden || p.hidden) return p;
      // No vehicle reaches ~300 km/h; anything faster is a teleport/respawn, which
      // must snap instead of sweeping across the map for the whole segment. Compare
      // squared distances so no sqrt is needed.
      const dtS = (b.t - a.t) / 1000;
      const maxD = MAX_INTERPOLATED_SPEED_KMH * (1000 / 3600) * Math.max(dtS, 0.001);
      if (dist2DSq(prev, p) > maxD * maxD) {
        return p;
      }
      return create(PlayerPositionSchema, {
        ...p,
        x: prev.x + (p.x - prev.x) * alpha,
        y: prev.y + (p.y - prev.y) * alpha,
        z: prev.z + (p.z - prev.z) * alpha,
      });
    });
    return create(PlayerPositionsSchema, {
      players,
      timestampMs: BigInt(Math.round(a.t + (b.t - a.t) * alpha)),
    });
  };

  return {
    push(msg) {
      const t = Number(msg.timestampMs);
      // Without a snapshot timestamp the frame has no place on the render timeline.
      if (!Number.isFinite(t) || t <= 0) return;
      const newest = frames.at(-1);
      if (newest && t <= newest.t) {
        // A backward clock (server restart) would otherwise freeze the buffer forever.
        if (t >= frames[0].t) return;
        frames = [];
      }
      if (frames.length < BUFFERED_FRAMES) {
        frames.push({ t, players: msg.players });
        // A second endpoint starts the segment: anchor alpha 0 at the wall clock.
        if (frames.length === 2) anchor = performance.now();
        return;
      }
      // Window is full (playing pair + holdback): the fresh frame replaces the
      // holdback, so a fast burst collapses to its latest snapshot.
      frames[2] = { t, players: msg.players };
    },

    reset() {
      frames = [];
    },

    tick(nowMs) {
      if (frames.length === 0) return undefined;
      const oldest = frames[0];

      // Played out: slide the window one frame; the holdback becomes the segment end
      // and the clock chains from the exact segment end (no later than one delta ago,
      // which also catches up after a stall).
      if (frames.length === 3 && nowMs - anchor >= frames[1].t - oldest.t) {
        const playedDelta = frames[1].t - oldest.t;
        const nextDelta = frames[2].t - frames[1].t;
        frames = frames.slice(1);
        anchor = Math.max(anchor + playedDelta, nowMs - nextDelta);
      }

      const start = frames[0];
      // During warmup (one frame) the snapshot passes through unchanged.
      const end = frames.length > 1 ? frames[1] : start;
      const segDelta = end.t - start.t;
      const alpha = segDelta > 0 ? Math.min(Math.max((nowMs - anchor) / segDelta, 0), 1) : 1;

      if (lastEmit?.frames === frames && lastEmit.alpha === alpha) {
        return lastEmit.out;
      }
      const out = interpolate(start, end, alpha);
      lastEmit = { frames, alpha, out };
      return out;
    },
  };
};

export interface InterpolatedPlayerPositions extends StreamResult<PlayerPositions> {
  /** Newest decoded snapshot, uninterpolated - exact data for text readouts. */
  readonly snapshot: PlayerPositions | undefined;
}

export const createInterpolatedPlayerPositionsStream = (
  input?: QueryParam<PlayerStreamInput>,
): InterpolatedPlayerPositions => {
  const stream = createPlayerPositionsV2Stream(input);
  const interp = createPlayerInterpolator();

  let data = $state.raw<PlayerPositions | undefined>(undefined);

  // Per message: buffer the snapshot; reduced motion renders it raw, without a clock.
  $effect(() => {
    const msg = stream.data;
    if (msg && msg.timestampMs > 0n) {
      interp.push(msg);
    } else if (msg) {
      // A backend without snapshot timestamps: render raw rather than showing nothing.
      data = msg;
    } else {
      // A stream has no cache to fall back on - disabled or reset clears the buffer.
      interp.reset();
      data = undefined;
    }
    if (prefersReducedMotion.current) data = msg;
  });

  // Per stream lifecycle: the rAF render clock, only while there is something to play.
  $effect(() => {
    if (prefersReducedMotion.current || stream.status === 'pending') return;
    let raf = 0;
    const loop = (nowMs: number) => {
      data = interp.tick(nowMs) ?? data;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  });

  return {
    get data() {
      return data;
    },
    get error() {
      return stream.error;
    },
    get status() {
      return stream.status;
    },
    get isPending() {
      return stream.isPending;
    },
    get isSuccess() {
      return stream.isSuccess;
    },
    get isError() {
      return stream.isError;
    },
    get snapshot() {
      return stream.data;
    },
  };
};
