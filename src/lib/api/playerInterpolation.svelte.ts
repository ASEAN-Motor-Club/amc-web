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
 * Smooth player rendering: the newest received snapshot is always the playing
 * segment's end — one snapshot of render delay. Segment durations come from the
 * protobuf `timestampMs` deltas; positions lerp on a rAF clock with alpha uncapped
 * past 1, so a late next snapshot extrapolates along the segment instead of freezing.
 * Everything else (roster, vehicle, hidden flag) is the newer snapshot's value.
 */

interface Frame {
  /** Snapshot epoch ms (protobuf timestampMs). */
  t: number;
  players: PlayerPosition[];
}

/** No game vehicle reaches this; a faster implied displacement is a teleport/respawn. */
const MAX_INTERPOLATED_SPEED_KMH = 300;
/** Game coordinates are Unreal centimeters. */
const CM_PER_M = 100;

export interface PlayerInterpolator {
  /** Feeds one decoded snapshot; duplicates and reordered frames are dropped. */
  push: (msg: PlayerPositions) => void;
  /** Drops buffered frames (stream disabled or reset). */
  reset: () => void;
  /**
   * Advances the render clock to `nowMs` (a rAF timestamp) and returns the interpolated
   * snapshot. Returns the same object while frames and alpha are unchanged (e.g. the
   * alpha-0 hold after an early handover), so consumers can skip no-op frames.
   */
  tick: (nowMs: number) => PlayerPositions | undefined;
}

export const createPlayerInterpolator = (): PlayerInterpolator => {
  /**
   * Playing window: [segmentStart, segmentEnd] where segmentEnd is always the newest
   * received frame — one snapshot of render delay. A fresh frame slides the window on
   * push; tick never mutates it. While the next snapshot is late the uncapped alpha
   * extrapolates past the segment end instead of stalling.
   */
  let frames: Frame[] = [];
  /**
   * rAF-clock time at which the playing segment started (alpha 0). Anchored when the
   * segment's second endpoint arrives; a push slide chains it by the played portion
   * of the old segment, keeping the rendered timestamp continuous.
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
      // Coordinates are Unreal cm; convert the m/s threshold to cm/s. Compare squared
      // distances so no sqrt is needed.
      const dtS = (b.t - a.t) / 1000;
      const maxD = MAX_INTERPOLATED_SPEED_KMH * (1000 / 3600) * Math.max(dtS, 0.001) * CM_PER_M;
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
      if (frames.length < 2) {
        frames.push({ t, players: msg.players });
        // A second endpoint starts the segment: anchor alpha 0 at the wall clock.
        if (frames.length === 2) anchor = performance.now();
        return;
      }
      // Newer snapshot: slide the window on arrival. The anchor chains by the old
      // segment's timestamp delta, so the rendered timeline continues from wherever
      // it currently plays: a late frame hands over from the extrapolated position
      // (uncapped alpha), an early one holds the new segment start until the wall
      // clock reaches it. The floor keeps the timeline from outrunning the data
      // after an extreme stall, snapping the render up to the newest snapshot.
      anchor = Math.max(
        anchor + (frames[1].t - frames[0].t),
        performance.now() - (t - frames[1].t),
      );
      frames = [frames[1], { t, players: msg.players }];
    },

    reset() {
      frames = [];
    },

    tick(nowMs) {
      if (frames.length === 0) return undefined;
      const start = frames[0];
      // Warmup (one frame) passes the snapshot through unchanged; two frames lerp.
      const end = frames.length > 1 ? frames[1] : start;
      const segDelta = end.t - start.t;
      // Uncapped above 1: while the next snapshot is late, the motion extrapolates
      // along the segment instead of freezing. Clamped at 0 so an early handover
      // holds the segment start instead of rendering before any data.
      const alpha = segDelta > 0 ? Math.max((nowMs - anchor) / segDelta, 0) : 1;

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
