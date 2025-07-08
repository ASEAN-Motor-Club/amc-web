// src/lib/api/radio.ts
export const getNowPlaying = async (signal?: AbortSignal): Promise<string> => {
  try {
    const response = await fetch('/api/now-playing', { signal });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    return data.title;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.log('Now Playing fetch aborted');
      return 'Unknown Track';
    }
    console.error('Error fetching now playing:', error);
    return 'Error loading track info';
  }
};

export const getStreamUrl = (): string => {
  // Use API endpoint in production, direct URL in dev
  if (import.meta.env.PROD) {
    return '/api/stream';
  }
  return '/api/stream'; // Uses Vite proxy in development
};

export const startNowPlayingPolling = (
  callback: (track: string) => void,
  interval = 10000,
): AbortController => {
  const controller = new AbortController();

  const fetchAndUpdate = async () => {
    try {
      const track = await getNowPlaying(controller.signal);
      callback(track);
    } catch (error) {
      console.error('Polling error:', error);
      callback('Error loading track');
    }
  };

  // Initial fetch
  fetchAndUpdate();

  // Set up polling
  const timer = setInterval(fetchAndUpdate, interval);

  // Cleanup function
  controller.signal.addEventListener('abort', () => {
    clearInterval(timer);
  });

  return controller;
};
