import { describe, expect, it } from 'vitest';
import { pinSchema, pinsSchema } from './pin';

describe('pinSchema', () => {
  it('accepts a minimal pin with only coordinates', () => {
    const result = pinSchema.safeParse({ x: 10, y: -20.5 });
    expect(result.success).toBe(true);
  });

  it('accepts a pin with a label', () => {
    const result = pinSchema.safeParse({ x: 0, y: 0, label: 'Warehouse' });
    expect(result.success).toBe(true);
  });

  it('rejects a missing x', () => {
    const result = pinSchema.safeParse({ y: 1 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Pin x must be a number');
    }
  });

  it('rejects a missing y', () => {
    const result = pinSchema.safeParse({ x: 1 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Pin y must be a number');
    }
  });

  it('rejects non-numeric coordinates', () => {
    for (const bad of ['1', null, undefined, {}, NaN]) {
      const result = pinSchema.safeParse({ x: bad, y: 1 });
      expect(result.success, String(bad)).toBe(false);
    }
  });

  it('rejects an empty label', () => {
    const result = pinSchema.safeParse({ x: 1, y: 1, label: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Pin label cannot be empty');
    }
  });

  it('rejects a non-string label', () => {
    const result = pinSchema.safeParse({ x: 1, y: 1, label: 42 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Pin label must be a string');
    }
  });
});

describe('pinsSchema', () => {
  it('accepts a non-empty array of pins', () => {
    const result = pinsSchema.safeParse([
      { x: 1, y: 1 },
      { x: 2, y: 2, label: 'A' },
    ]);
    expect(result.success).toBe(true);
  });

  it('rejects an empty array', () => {
    const result = pinsSchema.safeParse([]);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('At least one pin is required');
    }
  });

  it('rejects an array containing an invalid pin', () => {
    const result = pinsSchema.safeParse([{ x: 1, y: 1 }, { y: 2 }]);
    expect(result.success).toBe(false);
  });
});
