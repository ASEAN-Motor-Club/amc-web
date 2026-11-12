import { render } from 'vitest-browser-svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PointType, type MapState } from './types.ts';
import { deliveryPoints } from '#lib/data/deliveryPoint.ts';
import { reProjectVec2 } from '#lib/utils/mapProjection.ts';
import type { MapViewState } from '#lib/ui/ThreeMap/view.ts';
import ThreeMapWrapper from './ThreeMapWrapper.test.svelte';

const mapState: MapState = {
  delivery: true,
  house: false,
  player: false,
  playerName: false,
  pins: false,
  pinLabels: false,
  teleport: false,
  teleportLabels: false,
  shortcutZone: false,
  shortcutZoneLabels: false,
  areaName: false,
  areaBound: false,
  jobOnly: false,
  houseVacantOnly: false,
  houseSevereOnly: false,
  houseLabels: false,
};

/** A named delivery point: a dot the map must hit-test at the centre of a view centred on it. */
const target = deliveryPoints.find((point) => point.type !== 'Resident_C');
if (!target) throw new Error('no delivery point in the data');
const initialView: MapViewState = { center: reProjectVec2(target.coord), zoom: 6 };

const baseProps = {
  view: 'ortho' as const,
  initialView,
  mapState,
  jobsData: [],
  playerData: [],
  houseData: undefined,
  depotData: undefined,
  pinsData: [],
  teleportData: [],
  shortcutZoneData: [],
};

const canvasOf = (container: HTMLElement) => {
  const canvas = container.querySelector('canvas');
  if (!canvas) throw new Error('map has no canvas');
  return canvas;
};

/** A mouse pointer event at a CSS offset from the canvas centre. */
function pointer(
  canvas: HTMLCanvasElement,
  type: string,
  dx = 0,
  dy = 0,
  init: PointerEventInit = {},
) {
  const rect = canvas.getBoundingClientRect();
  canvas.dispatchEvent(
    new PointerEvent(type, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      bubbles: true,
      clientX: rect.left + rect.width / 2 + dx,
      clientY: rect.top + rect.height / 2 + dy,
      ...init,
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ThreeMapWrapper input semantics', () => {
  it('reports the dot under the pointer through onHover, then clears it', async () => {
    const onHover = vi.fn();
    const output = await render(ThreeMapWrapper, { ...baseProps, onHover });
    const canvas = canvasOf(output.container);

    // Markers arrive once the scene and the delivery effect have run.
    await vi.waitFor(() => {
      pointer(canvas, 'pointermove');
      expect(onHover).toHaveBeenCalledWith(expect.anything(), expect.any(Array));
    });
    const [feature] = onHover.mock.calls.at(-1) ?? [];
    expect(feature.pointType).toBe(PointType.Delivery);

    pointer(canvas, 'pointermove', 250, 150);
    expect(onHover.mock.calls.at(-1)?.[0]).toBeUndefined();
  });

  it('clicks a dot on release without drag, never at the start of a drag', async () => {
    const onClick = vi.fn();
    const output = await render(ThreeMapWrapper, { ...baseProps, onClick });
    const canvas = canvasOf(output.container);
    await vi.waitFor(() => {
      pointer(canvas, 'pointermove');
      pointer(canvas, 'pointerdown');
      pointer(canvas, 'pointerup', 0, 0, { buttons: 0 });
      expect(onClick).toHaveBeenCalled();
    });
    expect(onClick.mock.calls.at(-1)?.[0].pointType).toBe(PointType.Delivery);

    onClick.mockClear();
    pointer(canvas, 'pointerdown');
    pointer(canvas, 'pointermove', 40, 0);
    pointer(canvas, 'pointerup', 40, 0, { buttons: 0 });
    expect(onClick).not.toHaveBeenCalled();
  });

  it('forwards a right click with the hovered dot', async () => {
    const onRightClick = vi.fn();
    const onHover = vi.fn();
    const output = await render(ThreeMapWrapper, { ...baseProps, onRightClick, onHover });
    const canvas = canvasOf(output.container);
    await vi.waitFor(() => {
      pointer(canvas, 'pointermove');
      expect(onHover).toHaveBeenCalledWith(expect.anything(), expect.any(Array));
    });

    canvas.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));

    expect(onRightClick).toHaveBeenCalledOnce();
    expect(onRightClick.mock.calls[0][0].pointType).toBe(PointType.Delivery);
  });

  it('with the picker armed, a click reports its game coordinate and selects nothing', async () => {
    const onPick = vi.fn();
    const onClick = vi.fn();
    const onHover = vi.fn();
    const output = await render(ThreeMapWrapper, {
      ...baseProps,
      pickMode: true,
      onPick,
      onClick,
      onHover,
    });
    const canvas = canvasOf(output.container);
    await vi.waitFor(() => {
      pointer(canvas, 'pointerdown');
      pointer(canvas, 'pointerup', 0, 0, { buttons: 0 });
      expect(onPick).toHaveBeenCalled();
    });

    // The view is centred on the delivery point, so the centre click is within a pixel of it.
    // At zoom 6, one CSS px is ~1.3 m = ~134 game cm.
    const [coord] = onPick.mock.calls.at(-1) ?? [];
    expect(Math.abs(coord.x - target.coord.x)).toBeLessThan(400);
    expect(Math.abs(coord.y - target.coord.y)).toBeLessThan(400);
    expect(onClick).not.toHaveBeenCalled();
    // The picker shows no tooltips: hovering the same dot reports nothing.
    pointer(canvas, 'pointermove');
    expect(onHover.mock.calls.filter(([feature]) => feature !== undefined)).toHaveLength(0);
    expect(canvas.style.cursor).toBe('crosshair');
  });

  it('reports the view it was opened at', async () => {
    const output = await render(ThreeMapWrapper, baseProps);
    canvasOf(output.container);
    // The scene mounts asynchronously; the opened view is what getViewState reports back.
    await vi.waitFor(() => {
      const wrapperView = (
        output.component as unknown as { getViewState?: () => MapViewState | undefined }
      ).getViewState?.();
      expect(wrapperView?.zoom).toBeCloseTo(6);
      expect(wrapperView?.center[0]).toBeCloseTo(initialView.center[0], 0);
      expect(wrapperView?.center[1]).toBeCloseTo(initialView.center[1], 0);
    });
  });
});
