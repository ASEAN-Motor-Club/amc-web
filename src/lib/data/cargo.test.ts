import { describe, expect, it } from 'vitest';
import { cargoMetadata, cargoName } from './cargo';

describe('cargoName', () => {
  it('has an English name for every cargo and cargo type', () => {
    const keys = Object.keys(cargoName);
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(cargoName[key as keyof typeof cargoName].en, key).toBeTruthy();
    }
  });
});

describe('cargoMetadata', () => {
  it('is non-empty and every cargo has a name entry', () => {
    const entries = Object.entries(cargoMetadata);
    expect(entries.length).toBeGreaterThan(0);
    for (const [key, meta] of entries) {
      expect(cargoName[key as keyof typeof cargoName], key).toBeDefined();
      expect(meta.type).toBeTruthy();
    }
  });

  it('keeps distance bounds consistent when both are present', () => {
    for (const [key, meta] of Object.entries(cargoMetadata)) {
      if (meta.minDist !== undefined && meta.maxDist !== undefined) {
        expect(meta.minDist, key).toBeLessThanOrEqual(meta.maxDist);
      }
    }
  });
});
