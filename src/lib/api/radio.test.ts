import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getStreamUrl } from './radio';

/** Only needed because `getStreamUrl` returns a root-relative url. */
const URL_BASE = 'https://example.invalid';
const FROZEN_TIME = new Date('2026-08-07T12:00:00.000Z');
const CLOCK_STEP_MS = 1_000;

describe('getStreamUrl', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FROZEN_TIME);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('points at the stream endpoint', () => {
    expect(new URL(getStreamUrl(), URL_BASE).pathname).toBe('/stream');
  });

  it('carries the current clock in the cache-busting t parameter', () => {
    const { searchParams } = new URL(getStreamUrl(), URL_BASE);

    expect(searchParams.get('t')).toBe(String(FROZEN_TIME.getTime()));
  });

  it('returns the same url while the clock is frozen', () => {
    expect(getStreamUrl()).toBe(getStreamUrl());
  });

  it('busts the cache with a new url once the clock advances', () => {
    const before = getStreamUrl();

    vi.advanceTimersByTime(CLOCK_STEP_MS);
    const after = getStreamUrl();

    expect(after).not.toBe(before);
    expect(new URL(after, URL_BASE).searchParams.get('t')).toBe(
      String(FROZEN_TIME.getTime() + CLOCK_STEP_MS),
    );
  });
});
