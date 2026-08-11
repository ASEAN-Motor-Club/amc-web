import { describe, expect, it } from 'vitest';
import { m } from '$messages';
import type { TrackIssue } from '$lib/schema/track';
import { formatTrackError } from './formatError';

describe('formatTrackError', () => {
  const cases: { issue: TrackIssue; expected: string }[] = [
    {
      issue: { code: 'invalid_type', path: ['routeName'], expected: 'string' },
      expected: m['track_editor.validate.name_must_be_string'](),
    },
    {
      issue: { code: 'too_small', path: ['routeName'], minimum: 1 },
      expected: m['track_editor.validate.name_empty'](),
    },
    {
      issue: { code: 'too_small', path: ['waypoints'], minimum: 2 },
      expected: m['track_editor.validate.waypoints_min_length']({ minLength: 2 }),
    },
    {
      issue: { code: 'too_big', path: ['waypoints'], maximum: 50 },
      expected: m['track_editor.validate.waypoints_max_length']({ maxLength: 50 }),
    },
    {
      issue: {
        code: 'invalid_type',
        path: ['waypoints', 0, 'translation', 'x'],
        expected: 'number',
      },
      expected: m['track_editor.validate.waypoint_invalid']({
        index: 1,
        key: 'translation.x',
        type: 'number',
      }),
    },
    {
      issue: { code: 'invalid_type', path: ['waypoints'], expected: 'array' },
      expected: m['track_editor.validate.waypoint_invalid']({
        index: m.unknown(),
        key: m.unknown(),
        type: 'array',
      }),
    },
  ];

  it('maps every track schema issue to its localized message', () => {
    for (const { issue, expected } of cases) {
      expect(formatTrackError(issue)).toBe(expected);
    }
  });
});
