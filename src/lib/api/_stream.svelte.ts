import { focusManager } from '@tanstack/svelte-query';
import type { QueryParam } from './_api';

/** Mirrors TanStack's query status, applied to a push stream instead of a fetch. */
export type StreamStatus = 'pending' | 'success' | 'error';

export interface StreamResult<TData> {
  /** Latest payload pushed by the stream; `undefined` until the first message arrives. */
  readonly data: TData | undefined;
  /** Last transport or decode failure; cleared by the next successful message. */
  readonly error: Error | undefined;
  readonly status: StreamStatus;
  readonly isPending: boolean;
  readonly isSuccess: boolean;
  readonly isError: boolean;
}

interface StreamHandlers<TData> {
  onData: (data: TData) => void;
  onError: (error: Error) => void;
}

interface StreamTransport {
  close: () => void;
}

interface StreamSource<TData> {
  /** Opens the underlying transport; the returned handle is closed on teardown. */
  open: (handlers: StreamHandlers<TData>) => StreamTransport;
  /** Gate for the connection; defaults to open. */
  enabled?: boolean;
}

/**
 * Shared machinery behind the stream wrappers: owns the reactive state and the connection
 * lifecycle so callers read values instead of wiring callbacks.
 *
 * Visibility is delegated to TanStack's `focusManager`, the same one driving query
 * `refetchOnWindowFocus` — it owns the `visibilitychange` listener, so the stream only reacts to
 * focus notifications rather than duplicating DOM bookkeeping. Teardown rides on the `$effect`,
 * which removes the abort-signal plumbing the callback API needed.
 */
const createStream = <TData>(source: QueryParam<StreamSource<TData>>): StreamResult<TData> => {
  let data = $state.raw<TData | undefined>(undefined);
  let error = $state.raw<Error | undefined>(undefined);

  const status = $derived<StreamStatus>(
    error !== undefined ? 'error' : data !== undefined ? 'success' : 'pending',
  );

  $effect(() => {
    const { open, enabled = true } = source();

    if (!enabled) {
      // A stream has no cache to fall back on, so keeping the last frame would render live data
      // that is silently frozen. Losing focus only closes the transport; disabling clears it.
      data = undefined;
      error = undefined;
      return;
    }

    let transport: StreamTransport | undefined;

    const disconnect = () => {
      transport?.close();
      transport = undefined;
    };

    const syncToFocus = () => {
      if (!focusManager.isFocused()) {
        disconnect();
        return;
      }

      transport ??= open({
        onData: (next) => {
          data = next;
          error = undefined;
        },
        onError: (next) => {
          error = next;
        },
      });
    };

    syncToFocus();
    const unsubscribe = focusManager.subscribe(syncToFocus);

    return () => {
      unsubscribe();
      disconnect();
    };
  });

  return {
    get data() {
      return data;
    },
    get error() {
      return error;
    },
    get status() {
      return status;
    },
    get isPending() {
      return status === 'pending';
    },
    get isSuccess() {
      return status === 'success';
    },
    get isError() {
      return status === 'error';
    },
  };
};

export interface EventSourceStreamInput {
  /** URL of the SSE endpoint. */
  url: string;
  /** Gate for the connection; defaults to open. */
  enabled?: boolean;
}

/** Server-sent JSON events exposed as reactive state. */
export const createEventSourceStream = <TData>(
  input: QueryParam<EventSourceStreamInput>,
): StreamResult<TData> =>
  createStream<TData>(() => {
    const { url, enabled } = input();

    return {
      enabled,
      open: ({ onData, onError }) => {
        const source = new EventSource(url);

        source.onmessage = (event: MessageEvent<string>) => {
          try {
            onData(JSON.parse(event.data) as TData);
          } catch {
            onError(new Error(`Malformed message from ${url}`));
          }
        };

        source.onerror = () => {
          onError(new Error(`Connection error on ${url}`));
        };

        return {
          close: () => {
            source.close();
          },
        };
      },
    };
  });

const PROTOBUF_SUBPROTOCOL = 'protobuf';

export interface WebSocketStreamInput<TData> {
  /** URL of the WebSocket endpoint. */
  url: string;
  /** Decodes one binary frame; throwing marks the stream errored. */
  decode: (frame: ArrayBuffer) => TData;
  /** Gate for the connection; defaults to open. */
  enabled?: boolean;
}

/** Binary protobuf WebSocket frames exposed as reactive state. */
export const createWebSocketStream = <TData>(
  input: QueryParam<WebSocketStreamInput<TData>>,
): StreamResult<TData> =>
  createStream<TData>(() => {
    const { url, decode, enabled } = input();

    return {
      enabled,
      open: ({ onData, onError }) => {
        const socket = new WebSocket(url, [PROTOBUF_SUBPROTOCOL]);
        socket.binaryType = 'arraybuffer';

        socket.onmessage = (event: MessageEvent<ArrayBuffer>) => {
          try {
            onData(decode(event.data));
          } catch {
            onError(new Error(`Malformed frame from ${url}`));
          }
        };

        socket.onerror = () => {
          onError(new Error(`Connection error on ${url}`));
        };

        return {
          close: () => {
            socket.onmessage = null;
            socket.onerror = null;
            socket.close();
          },
        };
      },
    };
  });
