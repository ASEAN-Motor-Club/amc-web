// src/lib/api/radio.ts
import { startVisibilityAwarePolling } from './_api';

export const getNowPlaying = async (signal: AbortSignal): Promise<string> => {
  try {
    const response = await fetch('/icecast-status', { signal });

    if (!response.ok) {
      throw new Error(`Icecast error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data?.icestats?.source?.title || 'Unknown Track';
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.info('Now Playing fetch aborted');
      return 'Unknown Track';
    }
    console.error('Error fetching now playing:', error);
    return 'Error loading track info';
  }
};

export const getStreamUrl = (): string => {
  return `/stream_high?t=${Date.now()}`;
};

export const startNowPlayingPolling = (
  callback: (track: string) => void,
  interval = 120000, // 2 minutes
): (() => void) => {
  return startVisibilityAwarePolling(
    'Now playing',
    (signal) => getNowPlaying(signal),
    (track) => callback(track || 'Error loading track'),
    () => undefined,
    interval,
  );
};
