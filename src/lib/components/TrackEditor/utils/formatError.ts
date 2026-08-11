import { m } from '$messages';
import type { TrackIssue } from '$lib/schema/track';

/**
 * Localize a raw zod/mini issue from {@link trackSchema} in one step. The schema is built only
 * from `z.string`/`z.number`/`z.object`/`z.array` plus min/max length checks, so its issues can
 * only be `invalid_type`, `too_small` and `too_big`.
 */
export const formatTrackError = (issue: TrackIssue): string => {
  switch (issue.code) {
    case 'invalid_type': {
      if (issue.path[0] === 'routeName') return m['track_editor.validate.name_must_be_string']();
      return m['track_editor.validate.waypoint_invalid']({
        index: typeof issue.path[1] === 'number' ? issue.path[1] + 1 : m.unknown(),
        key: issue.path.slice(2).map(String).join('.') || m.unknown(),
        type: issue.expected ?? m.unknown(),
      });
    }
    case 'too_small':
      return issue.path[0] === 'waypoints'
        ? m['track_editor.validate.waypoints_min_length']({ minLength: Number(issue.minimum) })
        : m['track_editor.validate.name_empty']();
    case 'too_big':
      return m['track_editor.validate.waypoints_max_length']({ maxLength: Number(issue.maximum) });
    default:
      throw new Error(`Unexpected track schema issue code: ${issue.code}`);
  }
};
