import isError from 'lodash-es/isError';

/**
 * Generic API fetch function with standardized error handling
 *
 * @param url - The URL to fetch
 * @param signal - AbortSignal for cancellation
 * @param defaultValue - Default value to return on abort
 * @param errorContext - Context for error logging (e.g., "teams", "delivery points")
 * @returns Promise with the parsed JSON data or default value on abort
 */
export const apiClient = async <TData>(
  url: string,
  signal: AbortSignal,
  defaultValue: TData,
  errorContext: string,
): Promise<TData> => {
  try {
    const response = await fetch(url, {
      signal: signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as TData;
    return data;
  } catch (error) {
    if (isAbortError(error)) {
      console.info('Fetch aborted');
      return defaultValue;
    }
    console.error(`Error fetching ${errorContext}:`, error);
    throw error;
  }
};

/**
 * Generic visibility-aware polling function
 * Automatically pauses polling when page is hidden and resumes when visible
 *
 * @param name - Name for logging purposes (e.g., "Delivery Point", "Now Playing")
 * @param fetchFn - Async function that fetches data and takes an AbortSignal
 * @param callback - Callback function to handle the fetched data or errors
 * @param interval - Polling interval in milliseconds
 */
export const startVisibilityAwarePolling = <TData, TErrorData>(
  name: string,
  fetchFn: (signal: AbortSignal) => Promise<TData>,
  callback: (data: TData | TErrorData) => void,
  errorDataGetter: () => TErrorData,
  interval: number,
  abortSignal: AbortSignal,
): void => {
  let timer: NodeJS.Timeout | null = null;

  const fetchAndUpdate = async () => {
    try {
      const data = await fetchFn(abortSignal);
      callback(data);
    } catch (error) {
      console.error(`${name} polling error:`, error);
      callback(errorDataGetter());
    }
  };

  const startTimer = () => {
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      if (!document.hidden) {
        fetchAndUpdate();
      }
    }, interval);
  };

  const stopTimer = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      stopTimer();
    } else {
      fetchAndUpdate();
      startTimer();
    }
  };

  // Initial fetch
  fetchAndUpdate();

  if (!document.hidden) {
    startTimer();
  }

  document.addEventListener('visibilitychange', handleVisibilityChange);

  abortSignal.addEventListener('abort', () => {
    stopTimer();
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  });
};

/**
 * Generic visibility-aware EventSource function
 * Automatically closes EventSource when page is hidden and reopens when visible
 *
 * @param name - Name for logging purposes (e.g., "Player Position")
 * @param url - EventSource URL
 * @param onMessage - Callback function to handle incoming messages
 * @param onError - Optional callback function to handle errors
 */
export const startVisibilityAwareEventSource = (
  name: string,
  url: string,
  onMessage: (data: unknown) => void,
  onError: ((error: Event) => void) | undefined,
  abortSignal: AbortSignal,
) => {
  let evt: EventSource | null = null;

  const createEventSource = () => {
    if (evt) {
      evt.close();
    }

    evt = new EventSource(url);

    evt.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        onMessage(data);
      } catch (error) {
        console.error(`${name} EventSource message parsing error:`, error);
      }
    };

    evt.onerror = (error) => {
      console.error(`${name} EventSource connection error`);
      if (onError) {
        onError(error);
      }
    };
  };

  const closeEventSource = () => {
    if (evt) {
      evt.close();
      evt = null;
    }
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      closeEventSource();
    } else {
      createEventSource();
    }
  };

  const handleBeforeUnload = () => {
    closeEventSource();
  };

  if (!document.hidden) {
    createEventSource();
  }

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('beforeunload', handleBeforeUnload);

  abortSignal.addEventListener('abort', () => {
    closeEventSource();
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('beforeunload', handleBeforeUnload);
  });
};

export const isAbortError = (error: unknown): boolean => {
  return isError(error) && (error.name === 'StaleReactionError' || error.name === 'AbortError');
};
