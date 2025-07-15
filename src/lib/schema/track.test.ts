import { describe, expect, it, vi } from 'vitest';
import { trackSchema } from './track';

// Mock the paraglide messages
vi.mock('$lib/paraglide/messages', () => ({
  m: {
    'track_editor.validate.name_must_be_string': vi.fn(() => 'Route name must be a string'),
    'track_editor.validate.name_empty': vi.fn(() => 'Route name cannot be empty'),
    'track_editor.validate.name_too_long': vi.fn(
      ({ maxLength }) => `Route name cannot exceed ${maxLength} characters`,
    ),
    'track_editor.validate.waypoint_invalid': vi.fn(
      ({ index, key, type }) => `Waypoint ${index}: ${key} must be ${type}`,
    ),
    'track_editor.validate.waypoints_min_length': vi.fn(
      ({ minLength }) => `Track must have at least ${minLength} waypoints`,
    ),
    'track_editor.validate.waypoints_max_length': vi.fn(
      ({ maxLength }) => `Track must not exceed ${maxLength} waypoints`,
    ),
    unknown: vi.fn(() => 'unknown'),
  },
}));

describe('trackSchema', () => {
  const validWaypoint = {
    translation: { x: 1.0, y: 2.0, z: 3.0 },
    scale3D: { x: 1.0, y: 1.0, z: 1.0 },
    rotation: { x: 0.0, y: 0.0, z: 0.0, w: 1.0 },
  };

  const validTrack = {
    routeName: 'Test Route',
    waypoints: [validWaypoint, { ...validWaypoint }],
  };

  describe('valid tracks', () => {
    it('should validate a minimal valid track', () => {
      const result = trackSchema.safeParse(validTrack);
      expect(result.success).toBe(true);
    });

    it('should validate a track with maximum allowed waypoints', () => {
      const trackWithManyWaypoints = {
        ...validTrack,
        waypoints: Array(50).fill(validWaypoint),
      };
      const result = trackSchema.safeParse(trackWithManyWaypoints);
      expect(result.success).toBe(true);
    });

    it('should validate a track with maximum length route name', () => {
      const trackWithLongName = {
        ...validTrack,
        routeName: '1234567890123456',
      };
      const result = trackSchema.safeParse(trackWithLongName);
      expect(result.success).toBe(true);
    });
  });

  describe('routeName validation', () => {
    it('should reject empty route name', () => {
      const trackWithEmptyName = {
        ...validTrack,
        routeName: '',
      };
      const result = trackSchema.safeParse(trackWithEmptyName);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Route name cannot be empty');
      }
    });

    it('should reject route name that is too long', () => {
      const trackWithLongName = {
        ...validTrack,
        routeName: '12345678901234567', // 17 characters
      };
      const result = trackSchema.safeParse(trackWithLongName);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Route name cannot exceed 16 characters');
      }
    });

    it('should reject non-string route name', () => {
      const trackWithInvalidName = {
        ...validTrack,
        routeName: 123,
      };
      const result = trackSchema.safeParse(trackWithInvalidName);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Route name must be a string');
      }
    });
  });

  describe('waypoints array validation', () => {
    it('should reject track with no waypoints', () => {
      const trackWithNoWaypoints = {
        ...validTrack,
        waypoints: [],
      };
      const result = trackSchema.safeParse(trackWithNoWaypoints);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Track must have at least 2 waypoints');
      }
    });

    it('should reject track with only one waypoint', () => {
      const trackWithOneWaypoint = {
        ...validTrack,
        waypoints: [validWaypoint],
      };
      const result = trackSchema.safeParse(trackWithOneWaypoint);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Track must have at least 2 waypoints');
      }
    });

    it('should reject track with too many waypoints', () => {
      const trackWithTooManyWaypoints = {
        ...validTrack,
        waypoints: Array(51).fill(validWaypoint),
      };
      const result = trackSchema.safeParse(trackWithTooManyWaypoints);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Track must not exceed 50 waypoints');
      }
    });
  });

  describe('waypoint validation', () => {
    describe('translation object', () => {
      it('should reject waypoint with missing translation', () => {
        const trackWithInvalidWaypoint = {
          ...validTrack,
          waypoints: [
            {
              ...validWaypoint,
              translation: undefined,
            },
            validWaypoint,
          ],
        };
        const result = trackSchema.safeParse(trackWithInvalidWaypoint);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Waypoint 1: translation must be object');
        }
      });

      it('should reject waypoint with missing translation.x', () => {
        const trackWithInvalidWaypoint = {
          ...validTrack,
          waypoints: [
            {
              ...validWaypoint,
              translation: { y: 2.0, z: 3.0 },
            },
            validWaypoint,
          ],
        };
        const result = trackSchema.safeParse(trackWithInvalidWaypoint);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Waypoint 1: translation.x must be number');
        }
      });

      it('should reject waypoint with non-number translation coordinates', () => {
        const trackWithInvalidWaypoint = {
          ...validTrack,
          waypoints: [
            {
              ...validWaypoint,
              translation: { x: 'invalid', y: 2.0, z: 3.0 },
            },
            validWaypoint,
          ],
        };
        const result = trackSchema.safeParse(trackWithInvalidWaypoint);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Waypoint 1: translation.x must be number');
        }
      });
    });

    describe('scale3D object', () => {
      it('should reject waypoint with missing scale3D', () => {
        const trackWithInvalidWaypoint = {
          ...validTrack,
          waypoints: [
            {
              ...validWaypoint,
              scale3D: undefined,
            },
            validWaypoint,
          ],
        };
        const result = trackSchema.safeParse(trackWithInvalidWaypoint);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Waypoint 1: scale3D must be object');
        }
      });
      it('should reject waypoint with missing scale3D.y', () => {
        const trackWithInvalidWaypoint = {
          ...validTrack,
          waypoints: [
            {
              ...validWaypoint,
              scale3D: { x: 1.0, z: 1.0 },
            },
            validWaypoint,
          ],
        };
        const result = trackSchema.safeParse(trackWithInvalidWaypoint);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Waypoint 1: scale3D.y must be number');
        }
      });

      it('should reject waypoint with non-number scale3D values', () => {
        const trackWithInvalidWaypoint = {
          ...validTrack,
          waypoints: [
            {
              ...validWaypoint,
              scale3D: { x: 1.0, y: null, z: 1.0 },
            },
            validWaypoint,
          ],
        };
        const result = trackSchema.safeParse(trackWithInvalidWaypoint);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Waypoint 1: scale3D.y must be number');
        }
      });
    });

    describe('rotation object', () => {
      it('should reject waypoint with missing rotation', () => {
        const trackWithInvalidWaypoint = {
          ...validTrack,
          waypoints: [
            {
              ...validWaypoint,
              rotation: undefined,
            },
            validWaypoint,
          ],
        };
        const result = trackSchema.safeParse(trackWithInvalidWaypoint);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Waypoint 1: rotation must be object');
        }
      });

      it('should reject waypoint with missing rotation.w', () => {
        const trackWithInvalidWaypoint = {
          ...validTrack,
          waypoints: [
            {
              ...validWaypoint,
              rotation: { x: 0.0, y: 0.0, z: 0.0 },
            },
            validWaypoint,
          ],
        };
        const result = trackSchema.safeParse(trackWithInvalidWaypoint);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Waypoint 1: rotation.w must be number');
        }
      });

      it('should reject waypoint with non-number rotation values', () => {
        const trackWithInvalidWaypoint = {
          ...validTrack,
          waypoints: [
            {
              ...validWaypoint,
              rotation: { x: 0.0, y: 0.0, z: 0.0, w: 'invalid' },
            },
            validWaypoint,
          ],
        };
        const result = trackSchema.safeParse(trackWithInvalidWaypoint);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Waypoint 1: rotation.w must be number');
        }
      });
    });
  });
});
