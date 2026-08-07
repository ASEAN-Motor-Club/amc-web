import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { tick } from 'svelte';
import { focusManager } from '@tanstack/svelte-query';
import {
  createEventSourceStream,
  createWebSocketStream,
  type StreamResult,
} from './_stream.svelte';

const SSE_URL = 'https://stream.test/events';
const WS_URL = 'wss://stream.test/socket';

class FakeEventSource {
  static instances: FakeEventSource[] = [];

  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  closed = false;

  constructor(readonly url: string) {
    FakeEventSource.instances.push(this);
  }

  close() {
    this.closed = true;
  }

  static get live() {
    return FakeEventSource.instances.filter((instance) => !instance.closed);
  }
}

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];

  onmessage: ((event: MessageEvent<ArrayBuffer>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  binaryType = '';
  closed = false;

  constructor(
    readonly url: string,
    readonly protocols: string[],
  ) {
    FakeWebSocket.instances.push(this);
  }

  close() {
    this.closed = true;
  }

  static get live() {
    return FakeWebSocket.instances.filter((instance) => !instance.closed);
  }
}

/**
 * Runs the stream inside an effect root so the test drives the same lifecycle a component would,
 * without needing a harness component.
 */
const mountStream = <TData>(create: () => StreamResult<TData>) => {
  let stream!: StreamResult<TData>;
  const dispose = $effect.root(() => {
    stream = create();
  });
  return {
    get stream() {
      return stream;
    },
    dispose,
  };
};

describe('createEventSourceStream', () => {
  const originalEventSource = window.EventSource;
  let mounted: { stream: StreamResult<{ count: number }>; dispose: () => void } | undefined;

  beforeEach(() => {
    FakeEventSource.instances = [];
    window.EventSource = FakeEventSource as unknown as typeof EventSource;
  });

  afterEach(() => {
    mounted?.dispose();
    mounted = undefined;
    window.EventSource = originalEventSource;
    focusManager.setFocused(undefined);
  });

  const mount = async (gate: { enabled: boolean } = { enabled: true }) => {
    mounted = mountStream(() =>
      createEventSourceStream<{ count: number }>(() => ({ url: SSE_URL, enabled: gate.enabled })),
    );
    await tick();
    return mounted.stream;
  };

  const push = async (payload: unknown) => {
    FakeEventSource.live[0]?.onmessage?.(
      new MessageEvent('message', { data: JSON.stringify(payload) }),
    );
    await tick();
  };

  it('exposes pushed messages as reactive state instead of invoking a callback', async () => {
    const stream = await mount();
    expect(stream.status).toBe('pending');
    expect(stream.isPending).toBe(true);
    expect(stream.data).toBeUndefined();

    await push({ count: 7 });

    expect(stream.data).toEqual({ count: 7 });
    expect(stream.status).toBe('success');
    expect(stream.isSuccess).toBe(true);
  });

  it('opens exactly one connection to the requested url', async () => {
    await mount();

    expect(FakeEventSource.live).toHaveLength(1);
    expect(FakeEventSource.live[0].url).toBe(SSE_URL);
  });

  it('closes on blur and reconnects on focus, driven by the tanstack focus manager', async () => {
    await mount();
    expect(FakeEventSource.live).toHaveLength(1);

    focusManager.setFocused(false);
    await tick();
    expect(FakeEventSource.live).toHaveLength(0);

    focusManager.setFocused(true);
    await tick();
    expect(FakeEventSource.live).toHaveLength(1);
  });

  it('keeps the last payload across a blur/focus cycle', async () => {
    const stream = await mount();
    await push({ count: 3 });

    focusManager.setFocused(false);
    await tick();
    focusManager.setFocused(true);
    await tick();

    expect(stream.data).toEqual({ count: 3 });
  });

  it('does not connect while disabled', async () => {
    await mount({ enabled: false });

    expect(FakeEventSource.live).toHaveLength(0);
  });

  it('disconnects and clears stale data when it becomes disabled', async () => {
    const gate = $state({ enabled: true });
    mounted = mountStream(() =>
      createEventSourceStream<{ count: number }>(() => ({ url: SSE_URL, enabled: gate.enabled })),
    );
    await tick();
    await push({ count: 5 });
    expect(mounted.stream.data).toEqual({ count: 5 });

    gate.enabled = false;
    await tick();

    expect(FakeEventSource.live).toHaveLength(0);
    expect(mounted.stream.data).toBeUndefined();
    expect(mounted.stream.status).toBe('pending');
  });

  it('surfaces transport failures as an error state', async () => {
    const stream = await mount();

    FakeEventSource.live[0].onerror?.(new Event('error'));
    await tick();

    expect(stream.status).toBe('error');
    expect(stream.isError).toBe(true);
    expect(stream.error?.message).toBe(`Connection error on ${SSE_URL}`);
  });

  it('surfaces malformed payloads as an error state', async () => {
    const stream = await mount();

    FakeEventSource.live[0].onmessage?.(new MessageEvent('message', { data: 'not json' }));
    await tick();

    expect(stream.error?.message).toBe(`Malformed message from ${SSE_URL}`);
  });

  it('clears an error once a later message arrives', async () => {
    const stream = await mount();

    FakeEventSource.live[0].onerror?.(new Event('error'));
    await tick();
    await push({ count: 1 });

    expect(stream.error).toBeUndefined();
    expect(stream.status).toBe('success');
  });

  it('closes the connection when the effect root is disposed', async () => {
    await mount();
    expect(FakeEventSource.live).toHaveLength(1);

    mounted?.dispose();
    mounted = undefined;

    expect(FakeEventSource.live).toHaveLength(0);
  });
});

describe('createWebSocketStream', () => {
  const originalWebSocket = window.WebSocket;
  let mounted: { stream: StreamResult<number>; dispose: () => void } | undefined;

  beforeEach(() => {
    FakeWebSocket.instances = [];
    window.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
  });

  afterEach(() => {
    mounted?.dispose();
    mounted = undefined;
    window.WebSocket = originalWebSocket;
    focusManager.setFocused(undefined);
  });

  const mount = async (decode: (frame: ArrayBuffer) => number) => {
    mounted = mountStream(() => createWebSocketStream<number>(() => ({ url: WS_URL, decode })));
    await tick();
    return mounted.stream;
  };

  const sendFrame = async (byte: number) => {
    FakeWebSocket.live[0]?.onmessage?.(
      new MessageEvent('message', { data: new Uint8Array([byte]).buffer }),
    );
    await tick();
  };

  it('negotiates the protobuf subprotocol and binary frames', async () => {
    await mount(() => 0);

    expect(FakeWebSocket.live).toHaveLength(1);
    expect(FakeWebSocket.live[0].url).toBe(WS_URL);
    expect(FakeWebSocket.live[0].protocols).toEqual(['protobuf']);
    expect(FakeWebSocket.live[0].binaryType).toBe('arraybuffer');
  });

  it('exposes each decoded frame as reactive state', async () => {
    const stream = await mount((frame) => new Uint8Array(frame)[0]);

    await sendFrame(42);

    expect(stream.data).toBe(42);
    expect(stream.status).toBe('success');
  });

  it('surfaces a failing decode as an error instead of throwing', async () => {
    const stream = await mount(() => {
      throw new Error('bad frame');
    });

    await sendFrame(1);

    expect(stream.status).toBe('error');
    expect(stream.error?.message).toBe(`Malformed frame from ${WS_URL}`);
  });

  it('closes on blur and reconnects on focus', async () => {
    await mount(() => 0);
    expect(FakeWebSocket.live).toHaveLength(1);

    focusManager.setFocused(false);
    await tick();
    expect(FakeWebSocket.live).toHaveLength(0);

    focusManager.setFocused(true);
    await tick();
    expect(FakeWebSocket.live).toHaveLength(1);
  });
});
