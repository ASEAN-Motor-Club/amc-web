import { z } from 'zod/v4-mini';
import { m } from '$lib/paraglide/messages.js';

const createWaypointError = (iss: { path?: PropertyKey[]; expected: string }) => {
  return m['track_editor.validate.waypoint_invalid']({
    index: typeof iss.path?.[1] === 'number' ? iss.path?.[1] + 1 : (iss.path?.[1] ?? m.unknown()),
    key:
      (iss.path?.[2].toString() ?? m.unknown()) +
      (iss.path?.[3] !== undefined ? '.' + iss.path[3].toString() : ''),
    type: iss.expected,
  });
};

export const trackSchema = z.object({
  routeName: z
    .string(m['track_editor.validate.name_must_be_string']())
    .check(
      z.minLength(1, m['track_editor.validate.name_empty']()),
      z.maxLength(16, m['track_editor.validate.name_too_long']({ maxLength: 16 })),
    ),
  waypoints: z
    .array(
      z.object({
        translation: z.object(
          {
            x: z.number({ error: createWaypointError }),
            y: z.number({ error: createWaypointError }),
            z: z.number({ error: createWaypointError }),
          },
          { error: ({ path }) => createWaypointError({ path, expected: 'object' }) },
        ),
        scale3D: z.object(
          {
            x: z.number({ error: createWaypointError }),
            y: z.number({ error: createWaypointError }),
            z: z.number({ error: createWaypointError }),
          },
          { error: ({ path }) => createWaypointError({ path, expected: 'object' }) },
        ),
        rotation: z.object(
          {
            x: z.number({ error: createWaypointError }),
            y: z.number({ error: createWaypointError }),
            z: z.number({ error: createWaypointError }),
            w: z.number({ error: createWaypointError }),
          },
          { error: ({ path }) => createWaypointError({ path, expected: 'object' }) },
        ),
      }),
    )
    .check(
      z.minLength(2, m['track_editor.validate.waypoints_min_length']({ minLength: 2 })),
      z.maxLength(50, m['track_editor.validate.waypoints_max_length']({ maxLength: 50 })),
    ),
});

export type Track = z.infer<typeof trackSchema>;
