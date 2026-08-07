import { render } from 'vitest-browser-svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tick } from 'svelte';
import { QueryClient } from '@tanstack/svelte-query';
import { deliveryPointQueryOptions } from '$lib/api/delivery';
import { deliveryPoints, type DeliveryPoint } from '$lib/data/deliveryPoint';
import Harness from './DeliveryInfo.test.svelte';

/** Mirrors the component's hover debounce so the boundary can be driven exactly. */
const HOVER_DEBOUNCE_MS = 200;

const SUPPLY_AMOUNT = 42;

const findSupplyPoint = (): DeliveryPoint => {
  const point = deliveryPoints.find((candidate) => candidate.allSupply.length > 0);
  if (!point) {
    throw new Error('no delivery point with supply in the bundled data');
  }
  return point;
};

describe('DeliveryInfo', () => {
  const point = findSupplyPoint();
  const mockFetch = vi.fn();
  const originalFetch = window.fetch;
  let queryClient: QueryClient;

  const settleTimers = async (ms: number) => {
    await vi.advanceTimersByTimeAsync(ms);
    await tick();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    window.fetch = mockFetch;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          guid: point.guid,
          last_updated: new Date().toISOString(),
          data: {
            deliveries: [],
            inputInventory: [],
            outputInventory: point.allSupply.map((cargoKey) => ({
              cargoKey,
              amount: SUPPLY_AMOUNT,
            })),
          },
        }),
    });
    queryClient = new QueryClient();
  });

  afterEach(() => {
    queryClient.clear();
    window.fetch = originalFetch;
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('does not request a point the pointer merely passes over', async () => {
    await render(Harness, { client: queryClient, hoverInfo: { info: point } });

    await settleTimers(HOVER_DEBOUNCE_MS - 1);

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('requests and renders the hovered point once the pointer settles', async () => {
    const output = await render(Harness, { client: queryClient, hoverInfo: { info: point } });

    await settleTimers(HOVER_DEBOUNCE_MS);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(`/deliverypoints/${point.guid}/`),
      expect.anything(),
    );
    expect(output.baseElement.textContent).toContain(String(SUPPLY_AMOUNT));
  });

  it('renders a recently hovered point from cache without another request', async () => {
    await queryClient.fetchQuery(deliveryPointQueryOptions(() => ({ id: point.guid }))());
    expect(mockFetch).toHaveBeenCalledTimes(1);
    mockFetch.mockClear();

    const output = await render(Harness, { client: queryClient, hoverInfo: { info: point } });
    await tick();

    expect(output.baseElement.textContent).toContain(String(SUPPLY_AMOUNT));

    await settleTimers(HOVER_DEBOUNCE_MS * 2);

    expect(mockFetch).not.toHaveBeenCalled();
  });
});
