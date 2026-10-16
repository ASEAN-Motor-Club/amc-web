<script lang="ts">
  import { onMount } from 'svelte';
  import * as THREE from 'three';
  import clsx from 'clsx';
  import { twMerge } from 'tailwind-merge';
  import type { ClassValue } from 'svelte/elements';
  import type { Vector2 } from '$lib/types';
  import type { MapViewState } from '$lib/ui/OlMap/OlMap.svelte';
  import type { SelectedTrackPoint, TrackPoint } from '$lib/ui/EditorOlMap/EditorOlMap.svelte';
  import { createThreeMapScene, type ThreeMapScene } from '$lib/ui/ThreeMap/scene';
  import { TILES_META } from '$lib/ui/ThreeMap/heightmap';
  import { gamePlaneToWorldXZ, worldXZToGamePlane } from '$lib/ui/ThreeMap/coords';
  import { reProjectPointInverse, reProjectVec2 } from '$lib/ui/OlMap/utils';
  import { createTrackGates, type GateSpec, type TrackGates } from './trackGates';

  export interface EditorThreeMapProps {
    /** The class to apply to the map element */
    class?: ClassValue;
    /** Map points */
    points: TrackPoint[];
    /** The currently selected point (its live editing-buffer position) */
    selectedPoint?: SelectedTrackPoint;
    /** Show waypoint numbers */
    showNum?: boolean;
    /** Callback fired when a point is clicked (undefined = empty map) */
    onPointClick?: (index: number | undefined) => void;
    /** Callback fired when the selected point's drag commits */
    onSelectedPointMove?: (newCoord: Vector2) => void;
  }

  const {
    class: propsClass,
    points,
    selectedPoint,
    showNum = false,
    onPointClick,
    onSelectedPointMove,
  }: EditorThreeMapProps = $props();

  let container: HTMLDivElement;
  let three = $state<ThreeMapScene | undefined>(undefined);
  let gates = $state<TrackGates | undefined>(undefined);

  /** px-space (0..2200000) point → world XZ meters centered on the map origin. */
  function pxToWorldXZ(px: [x: number, y: number]): [x: number, z: number] {
    const game = reProjectPointInverse(px);
    return gamePlaneToWorldXZ(game.x, game.y, TILES_META);
  }

  /** The same gate geometry the 2D editor draws: half the width on the yaw perpendicular. */
  function gateSpecFor(index: number, point: TrackPoint): GateSpec {
    const [px, py] = reProjectVec2(point.coord);
    const yaw = point.yaw ?? 0;
    const scaleY = point.scaleY ?? 1;
    const halfWidth = (scaleY * 100) / 2;
    const perpAngle = -(yaw + Math.PI / 2);
    const a = pxToWorldXZ([
      px + Math.cos(perpAngle) * halfWidth,
      py + Math.sin(perpAngle) * halfWidth,
    ]);
    const b = pxToWorldXZ([
      px - Math.cos(perpAngle) * halfWidth,
      py - Math.sin(perpAngle) * halfWidth,
    ]);
    return {
      index,
      center: pxToWorldXZ([px, py]),
      angle: Math.atan2(b[1] - a[1], b[0] - a[0]),
      widthM: Math.hypot(b[0] - a[0], b[1] - a[1]),
    };
  }

  const trackSpecs = $derived(points.map((point, index) => gateSpecFor(index, point)));
  const trackLine = $derived(
    points.map((point) => pxToWorldXZ(reProjectVec2(point.coord)) as [x: number, z: number]),
  );
  const selectedSpec = $derived(
    selectedPoint ? gateSpecFor(selectedPoint.index, selectedPoint) : undefined,
  );

  $effect(() => {
    if (!three || !gates) return;
    gates.setTrack(trackSpecs, trackLine, selectedPoint?.index, selectedSpec, showNum);
  });

  // ---- pointer interaction: hover, click-to-select, drag the selected gate. ----

  const _raycaster = new THREE.Raycaster();
  const _pointerNdc = new THREE.Vector2();
  const _dragPlane = new THREE.Plane();
  const _dragPoint = new THREE.Vector3();

  /** The gate under the pointer, or null. */
  function pickAt(event: { clientX: number; clientY: number }) {
    if (!three || !gates) return null;
    const rect = three.renderer.domElement.getBoundingClientRect();
    _pointerNdc.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    return gates.pick(_pointerNdc.x, _pointerNdc.y, three.camera, rect.width, rect.height);
  }

  /**
   * Presses on a gate belong to the editor (click-to-select or a drag), not to the ground
   * pan — groundPan queries this inside its own pointerdown, which runs before ours.
   */
  const groundPanBlocked = (event: PointerEvent): boolean => pickAt(event) !== null;

  interface PendingPress {
    /** The gate pressed, or undefined for empty map (a click there deselects). */
    index: number | undefined;
    clientX: number;
    clientY: number;
    /** True when the press grabbed the already-selected gate. */
    dragging: boolean;
    /** The grabbed gate's draped height — the horizontal drag plane. */
    grabY: number;
  }
  let pending: PendingPress | null = null;
  /** Latest drag position in world XZ, valid while `pending?.dragging`. */
  let dragWorld: [x: number, z: number] | null = null;
  /** A press only counts as a click when the pointer barely moved — a pan is not a click. */
  const CLICK_MAX_MOVE_PX = 5;

  function onPointerDown(event: PointerEvent): void {
    if (event.button !== 0 || !three) return;
    const hit = pickAt(event);
    if (hit && hit.index === selectedPoint?.index && onSelectedPointMove) {
      pending = {
        index: hit.index,
        clientX: event.clientX,
        clientY: event.clientY,
        dragging: true,
        grabY: hit.world.y,
      };
      dragWorld = null;
      three.renderer.domElement.setPointerCapture(event.pointerId);
      return;
    }
    pending = {
      index: hit?.index,
      clientX: event.clientX,
      clientY: event.clientY,
      dragging: false,
      grabY: 0,
    };
  }

  function onPointerMove(event: PointerEvent): void {
    if (!three || !gates) return;
    const hit = pickAt(event);
    gates.setHovered(hit?.index);
    if (!pending?.dragging) return;
    const rect = three.renderer.domElement.getBoundingClientRect();
    _pointerNdc.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    _raycaster.setFromCamera(_pointerNdc, three.camera);
    _dragPlane.set(new THREE.Vector3(0, 1, 0), -pending.grabY);
    if (!_raycaster.ray.intersectPlane(_dragPlane, _dragPoint)) return;
    dragWorld = [_dragPoint.x, _dragPoint.z];
    gates.dragTo(_dragPoint.x, _dragPoint.z);
  }

  function onPointerUp(event: PointerEvent): void {
    if (!pending) return;
    const press = pending;
    const lastDrag = dragWorld;
    pending = null;
    dragWorld = null;
    const moved =
      Math.hypot(event.clientX - press.clientX, event.clientY - press.clientY) > CLICK_MAX_MOVE_PX;
    if (press.dragging) {
      // Commit like the 2D editor's Translate interaction: once, on release.
      if (moved && lastDrag && onSelectedPointMove) {
        const [gx, gy] = worldXZToGamePlane(lastDrag[0], lastDrag[1], TILES_META);
        onSelectedPointMove({ x: gx, y: gy });
      }
      return;
    }
    if (!moved) {
      onPointClick?.(press.index);
    }
  }

  function onPointerLeave(): void {
    gates?.setHovered(undefined);
  }

  onMount(() => {
    three = createThreeMapScene(container, { groundPanBlocked });
    const scene = three;
    gates = createTrackGates(scene.scene, TILES_META, scene.groundHeights, scene.viewport);
    const unregisterFrame = scene.onFrame(() => gates?.update(scene.camera));
    const unregisterResize = scene.onResize(() => gates?.refit());
    const dom = scene.renderer.domElement;
    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('pointerleave', onPointerLeave);

    return () => {
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('pointermove', onPointerMove);
      dom.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('pointerleave', onPointerLeave);
      unregisterFrame();
      unregisterResize();
      gates?.dispose();
      gates = undefined;
      three?.dispose();
      three = undefined;
    };
  });

  // The 3D map has no OL view state to hand back across unmounts; the editor refits.
  export const getViewState = (): MapViewState | undefined => undefined;

  export const zoomFit = (): void => {
    if (!three || trackLine.length === 0) return;
    let minX = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxZ = -Infinity;
    for (const [x, z] of trackLine) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const radius = Math.max(Math.hypot(maxX - minX, maxZ - minZ) / 2, 150);
    const controls = three.controls;
    const camera = three.camera;
    controls.target.set(centerX, 0, centerZ);
    // A hair of tilt keeps lookAt off the degenerate straight-down axis.
    const distance = THREE.MathUtils.clamp(
      (radius / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.2,
      300,
      controls.maxDistance * 0.8,
    );
    camera.position.set(centerX + distance * 0.01, distance, centerZ);
    camera.lookAt(controls.target);
    controls.update();
  };
</script>

<div class={twMerge('h-full w-full', clsx(propsClass))} bind:this={container}></div>
