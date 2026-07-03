---
name: quaternion
description: Rotation math in the AMC web repo — track waypoint rotations are {x,y,z,w} quaternions handled with the quaternion package in TrackEditor utils. Read before touching track rotation or 3D-orientation code.
---

# quaternion

- Track data stores waypoint rotations as `{x, y, z, w}` quaternions (validated by `quaternionSchema` in `src/lib/schema/track.ts`).
- Rotation math uses the **quaternion** npm package inside `src/lib/components/TrackEditor/utils/` (e.g. `autoRotate.ts`, `normalized.ts`); vector helpers live in `src/lib/utils/math/`.
- Don't convert to Euler angles for intermediate math — work in quaternions and follow the existing utils, which have colocated tests.

Related: [[codebase-patterns]], [[zod]]
