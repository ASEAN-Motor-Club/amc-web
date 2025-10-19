import * as z from 'zod/mini';
import { m as msg } from '$lib/paraglide/messages';
import type { Vector3 } from '$lib/types';

const createWaypointError = (iss: { path?: PropertyKey[]; expected: string }) => {
  return msg['track_editor.validate.waypoint_invalid']({
    index: typeof iss.path?.[1] === 'number' ? iss.path[1] + 1 : (iss.path?.[1] ?? msg.unknown()),
    key:
      (iss.path?.[2].toString() ?? msg.unknown()) +
      (iss.path?.[3] !== undefined ? '.' + iss.path[3].toString() : ''),
    type: iss.expected,
  });
};

const vector3Schema = z.object(
  {
    x: z.number({ error: createWaypointError }),
    y: z.number({ error: createWaypointError }),
    z: z.number({ error: createWaypointError }),
  },
  { error: ({ path }) => createWaypointError({ path, expected: 'object' }) },
);

const quaternionSchema = z.object(
  {
    x: z.number({ error: createWaypointError }),
    y: z.number({ error: createWaypointError }),
    z: z.number({ error: createWaypointError }),
    w: z.number({ error: createWaypointError }),
  },
  { error: ({ path }) => createWaypointError({ path, expected: 'object' }) },
);

const waypointSchema = z.object({
  translation: vector3Schema,
  scale3D: vector3Schema,
  rotation: quaternionSchema,
});

export const trackSchema = z.object({
  routeName: z
    .string(msg['track_editor.validate.name_must_be_string']())
    .check(z.minLength(1, msg['track_editor.validate.name_empty']())),
  waypoints: z.array(waypointSchema).check(
    z.minLength(
      2,
      msg['track_editor.validate.waypoints_min_length']({
        minLength: 2,
      }),
    ),
    z.maxLength(
      50,
      msg['track_editor.validate.waypoints_max_length']({
        maxLength: 50,
      }),
    ),
  ),
});

export type Waypoint = z.infer<typeof waypointSchema>;
export type Track = z.infer<typeof trackSchema>;

export interface WaypointEuler {
  rotation: Vector3;
  translation: Vector3;
  scale3D: Vector3;
}
