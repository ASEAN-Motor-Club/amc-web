import { describe, it, expect } from 'vitest';
import { cssTimeToMs } from './cssTransitionToMs';

describe('cssTimeToMs', () => {
  describe('valid CSS time syntax', () => {
    it('should convert milliseconds correctly', () => {
      expect(cssTimeToMs('1ms')).toBe(1);
      expect(cssTimeToMs('100ms')).toBe(100);
      expect(cssTimeToMs('0ms')).toBe(0);
      expect(cssTimeToMs('0.5ms')).toBe(0.5);
      expect(cssTimeToMs('1.5ms')).toBe(1.5);
    });

    it('should convert seconds correctly', () => {
      expect(cssTimeToMs('1s')).toBe(1000);
      expect(cssTimeToMs('0s')).toBe(0);
      expect(cssTimeToMs('0.1s')).toBe(100);
      expect(cssTimeToMs('0.5s')).toBe(500);
      expect(cssTimeToMs('2.5s')).toBe(2500);
    });

    it('should handle whitespace correctly', () => {
      expect(cssTimeToMs(' 1ms ')).toBe(1);
      expect(cssTimeToMs(' 1s ')).toBe(1000);
      expect(cssTimeToMs('\t100ms\t')).toBe(100);
      expect(cssTimeToMs('\n0.5s\n')).toBe(500);
    });
  });

  describe('invalid CSS time syntax', () => {
    it('should return 0 for plain numbers', () => {
      expect(cssTimeToMs('0')).toBe(0);
      expect(cssTimeToMs('1000')).toBe(0);
      expect(cssTimeToMs('1.5')).toBe(0);
    });

    it('should return 0 for non-numeric strings', () => {
      expect(cssTimeToMs('adadadad')).toBe(0);
      expect(cssTimeToMs('hello')).toBe(0);
      expect(cssTimeToMs('test123')).toBe(0);
    });

    it('should return 0 for invalid strings ending with ms', () => {
      expect(cssTimeToMs('asdadadams')).toBe(0);
      expect(cssTimeToMs('helloms')).toBe(0);
      expect(cssTimeToMs('testms')).toBe(0);
    });

    it('should return 0 for invalid strings ending with s', () => {
      expect(cssTimeToMs('asds')).toBe(0);
      expect(cssTimeToMs('hellos')).toBe(0);
      expect(cssTimeToMs('tests')).toBe(0);
    });

    it('should return 0 for empty or whitespace strings', () => {
      expect(cssTimeToMs('')).toBe(0);
      expect(cssTimeToMs(' ')).toBe(0);
      expect(cssTimeToMs('\t')).toBe(0);
      expect(cssTimeToMs('\n')).toBe(0);
    });

    it('should return 0 for invalid units', () => {
      expect(cssTimeToMs('1px')).toBe(0);
      expect(cssTimeToMs('1em')).toBe(0);
      expect(cssTimeToMs('1rem')).toBe(0);
      expect(cssTimeToMs('1%')).toBe(0);
    });

    it('should return 0 for malformed time values', () => {
      expect(cssTimeToMs('ms')).toBe(0);
      expect(cssTimeToMs('s')).toBe(0);
      expect(cssTimeToMs('1.2.3ms')).toBe(0);
      expect(cssTimeToMs('1..5s')).toBe(0);
    });
  });
});
