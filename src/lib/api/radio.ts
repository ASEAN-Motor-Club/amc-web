// src/lib/api/radio.ts

export const getNowPlaying = async (signal?: AbortSignal): Promise<string> => {
  try {
    // Fetch directly from our own /icecast-status endpoint
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
  return '/stream_high';
};

export const startNowPlayingPolling = (
  callback: (track: string) => void,
  interval = 120000, // 2 minutes
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
