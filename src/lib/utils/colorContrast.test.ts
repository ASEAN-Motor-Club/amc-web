import { describe, expect, it } from 'vitest';
import { checkContrastCompliance, isValidHexColor } from './colorContrast';

describe('isValidHexColor', () => {
  it('accepts 3- and 6-digit hex colors with a leading hash', () => {
    expect(isValidHexColor('#fff')).toBe(true);
    expect(isValidHexColor('#ffffff')).toBe(true);
    expect(isValidHexColor('#FF00AA')).toBe(true);
  });

  it('rejects malformed colors', () => {
    expect(isValidHexColor('fff')).toBe(false);
    expect(isValidHexColor('#ffff')).toBe(false);
    expect(isValidHexColor('#fffff')).toBe(false);
    expect(isValidHexColor('#1234567')).toBe(false);
    expect(isValidHexColor('#ggg')).toBe(false);
    expect(isValidHexColor('#12 345')).toBe(false);
    expect(isValidHexColor('')).toBe(false);
  });
});

describe('checkContrastCompliance', () => {
  it('returns the WCAG contrast ratio between two colors', () => {
    const blackOnWhite = checkContrastCompliance('#ffffff', '#000000');
    expect(blackOnWhite.ratio).toBeCloseTo(21, 2);

    const sameColor = checkContrastCompliance('#123456', '#123456');
    expect(sameColor.ratio).toBeCloseTo(1, 2);
  });

  it('passes AA and AAA for black on white', () => {
    const result = checkContrastCompliance('#ffffff', '#000000');
    expect(result.passesAA).toBe(true);
    expect(result.passesAAA).toBe(true);
  });

  it('fails AA for white on white', () => {
    const result = checkContrastCompliance('#ffffff', '#ffffff');
    expect(result.ratio).toBeCloseTo(1, 2);
    expect(result.passesAA).toBe(false);
    expect(result.passesAAA).toBe(false);
  });

  it('fails AA for white text on red', () => {
    const result = checkContrastCompliance('#ff0000', '#ffffff');
    expect(result.ratio).toBeCloseTo(4, 1);
    expect(result.passesAA).toBe(false);
  });

  it('crosses the AA boundary between #747474 and #757575 on black', () => {
    const passes = checkContrastCompliance('#000000', '#757575');
    const fails = checkContrastCompliance('#000000', '#747474');
    expect(passes.ratio).toBeGreaterThanOrEqual(4.5);
    expect(passes.passesAA).toBe(true);
    expect(fails.ratio).toBeLessThan(4.5);
    expect(fails.passesAA).toBe(false);
  });

  it('never passes AAA without AA', () => {
    const result = checkContrastCompliance('#757575', '#000000');
    expect(result.passesAA).toBe(true);
    expect(result.passesAAA).toBe(false);
  });

  it('returns a zero ratio for invalid colors', () => {
    const result = checkContrastCompliance('not-a-color', '#000000');
    expect(result.ratio).toBe(0);
    expect(result.passesAA).toBe(false);
    expect(result.passesAAA).toBe(false);
  });
});
