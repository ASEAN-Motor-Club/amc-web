/**
 * Generic visibility-aware polling function
 * Automatically pauses polling when page is hidden and resumes when visible
 *
 * @param name - Name for logging purposes (e.g., "Delivery Point", "Now Playing")
 * @param fetchFn - Async function that fetches data and takes an AbortSignal
 * @param callback - Callback function to handle the fetched data or errors
 * @param interval - Polling interval in milliseconds
 * @returns Cleanup function to stop polling
 */
export const startVisibilityAwarePolling = <TData, TErrorData>(
  name: string,
  fetchFn: (signal: AbortSignal) => Promise<TData>,
  callback: (data: TData | TErrorData) => void,
  errorDataGetter: () => TErrorData,
  interval: number,
): (() => void) => {
  const controller = new AbortController();
  let timer: NodeJS.Timeout | null = null;

  const fetchAndUpdate = async () => {
    try {
      const data = await fetchFn(controller.signal);
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

  controller.signal.addEventListener('abort', () => {
    stopTimer();
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  });

  return () => {
    controller.abort();
  };
};

/**
 * Generic visibility-aware EventSource function
 * Automatically closes EventSource when page is hidden and reopens when visible
 *
 * @param name - Name for logging purposes (e.g., "Player Position")
 * @param url - EventSource URL
 * @param onMessage - Callback function to handle incoming messages
 * @param onError - Optional callback function to handle errors
 * @returns Cleanup function to close EventSource and remove listeners
 */
export const startVisibilityAwareEventSource = (
  name: string,
  url: string,
  onMessage: (data: unknown) => void,
  onError?: (error: Event) => void,
): (() => void) => {
  let evt: EventSource | null = null;
  let isActive = true;

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
    if (!isActive) return;

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

  return () => {
    isActive = false;
    closeEventSource();
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
};
