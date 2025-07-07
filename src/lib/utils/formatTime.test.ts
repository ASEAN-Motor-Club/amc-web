import { formatTime } from './formatTime';
import { describe, it, expect } from 'vitest';

describe('formatTime', () => {
  it('formats whole seconds', () => {
    expect(formatTime(0)).toBe('0:00.000');
    expect(formatTime(5)).toBe('0:05.000');
    expect(formatTime(65)).toBe('1:05.000');
  });

  it('formats with milliseconds', () => {
    expect(formatTime(1.234)).toBe('0:01.234');
    expect(formatTime(61.007)).toBe('1:01.007');
    expect(formatTime(3599.999)).toBe('59:59.999');
  });

  it('handles negative and NaN', () => {
    expect(formatTime(-1)).toBe('0:00.000');
    expect(formatTime(NaN)).toBe('0:00.000');
    expect(formatTime(Infinity)).toBe('0:00.000');
  });
});
