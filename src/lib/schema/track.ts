import * as z from 'zod/mini';
import type { Vector3 } from '$lib/types';

/** The subset of a zod/mini issue the track schema can produce. */
export interface TrackIssue {
  code: string;
  path: PropertyKey[];
  expected?: string;
  minimum?: number | bigint;
  maximum?: number | bigint;
}

const vector3Schema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

const quaternionSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
  w: z.number(),
});

const waypointSchema = z.object({
  translation: vector3Schema,
  scale3D: vector3Schema,
  rotation: quaternionSchema,
});

export const trackSchema = z.object({
  routeName: z.string().check(z.minLength(1)),
  waypoints: z.array(waypointSchema).check(z.minLength(2), z.maxLength(50)),
});

export type Waypoint = z.infer<typeof waypointSchema>;
export type Track = z.infer<typeof trackSchema>;

export interface WaypointEuler {
  rotation: Vector3;
  translation: Vector3;
  scale3D: Vector3;
}
