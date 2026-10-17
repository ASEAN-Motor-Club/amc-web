<script lang="ts">
  import { onMount } from 'svelte';
  import * as THREE from 'three';
  import clsx from 'clsx';
  import { twMerge } from 'tailwind-merge';
  import type { ClassValue } from 'svelte/elements';
  import type { Vector2, Vector3 } from '$lib/types';
  import type { MapViewState } from '$lib/ui/OlMap/OlMap.svelte';
  import type { Waypoint } from '$lib/schema/track';
  import { Quaternion } from 'quaternion';
  import { createThreeMapScene, type ThreeMapScene } from '$lib/ui/ThreeMap/scene';
  import { TRACK_EDITOR_MIN_DISTANCE_M } from '$lib/ui/ThreeMap/constants';
  import { TILES_META } from '$lib/ui/ThreeMap/heightmap';
  import { gameCoordToWorld, worldXZToGamePlane } from '$lib/ui/ThreeMap/coords';
  import { createTrackGates, type GateSpec, type TrackGates } from './trackGates';

  export interface EditorThreeMapProps {
    /** The class to apply to the map element */
    class?: ClassValue;
    /** The track's waypoints (full 3D data: quaternion rotation, translation z, scale3D) */
    waypoints: Waypoint[];
    /** The selected waypoint's live editing-buffer position (orange overlay), already
     * converted to the quaternion representation via the editor's `fromEulerWp`. */
    selectedWaypoint?: { index: number; waypoint: Waypoint };
    /** Show waypoint numbers */
    showNum?: boolean;
    /** Callback fired when a point is clicked (undefined = empty map) */
    onPointClick?: (index: number | undefined) => void;
    /** Callback fired when the selected point's drag commits */
    onSelectedPointMove?: (newCoord: Vector2) => void;
  }

  const {
    class: propsClass,
    waypoints,
    selectedWaypoint,
    showNum = false,
    onPointClick,
    onSelectedPointMove,
  }: EditorThreeMapProps = $props();

  let container: HTMLDivElement;
  let three = $state<ThreeMapScene | undefined>(undefined);
  let gates = $state<TrackGates | undefined>(undefined);

  /** World position of a game point (UE cm, x right / y south / z up) → world meters. */
  function worldPos(game: Vector3): [x: number, y: number, z: number] {
    return gameCoordToWorld(game, TILES_META);
  }

  /**
   * The gate geometry straight from the waypoint's 3D data: the gate spans along the
   * rotation's local Y axis (UE: X forward, Y right, Z up), half of scale3D.y × 100 cm to
   * each side — the same width formula the 2D editor draws, but with the FULL quaternion,
   * so pitch/roll tilt the gate like the game does. The quaternion rotates in the UE
   * frame and only then maps to world components (x, -y, z), so three.js's own rotation
   * conventions never enter the math.
   */
  /** The package's rotateVector return is typed as a union (array | {x,y,z}); both
   * shapes carry the same components — normalize to a tuple for the spec math. */
  function rotatedAxis(q: Quaternion, axis: [number, number, number]): [number, number, number] {
    const v = q.rotateVector(axis);
    return Array.isArray(v) ? [v[0], v[1], v[2]] : [v.x, v.y, v.z];
  }

  /** Half-extent vector of one box axis in world meters: the rotation's local axis,
   * scaled by the waypoint's scale3D (UE cm → the game object is a 1 m cube at
   * scale 1,1,1), mapped through worldPos like the width endpoints. */
  function axisHalfExtent(
    q: Quaternion,
    axis: [number, number, number],
    scale: number,
    t: Vector3,
    centerWorld: [number, number, number],
  ): [number, number, number] {
    const [rx, ry, rz] = rotatedAxis(q, axis);
    const halfCm = (scale * 100) / 2;
    const tip = worldPos({
      x: t.x + rx * halfCm,
      y: t.y + ry * halfCm,
      z: t.z + rz * halfCm,
    });
    return [tip[0] - centerWorld[0], tip[1] - centerWorld[1], tip[2] - centerWorld[2]];
  }

  function gateSpecFor(index: number, waypoint: Waypoint): GateSpec {
    const q = new Quaternion(waypoint.rotation);
    const [rx, ry, rz] = rotatedAxis(q, [0, 1, 0]);
    const halfWidth = (waypoint.scale3D.y * 100) / 2;
    const t = waypoint.translation;
    const center = worldPos(t);
    return {
      index,
      center,
      a: worldPos({
        x: t.x + rx * halfWidth,
        y: t.y + ry * halfWidth,
        z: t.z + rz * halfWidth,
      }),
      b: worldPos({
        x: t.x - rx * halfWidth,
        y: t.y - ry * halfWidth,
        z: t.z - rz * halfWidth,
      }),
      ex: axisHalfExtent(q, [1, 0, 0], waypoint.scale3D.x, t, center),
      ez: axisHalfExtent(q, [0, 0, 1], waypoint.scale3D.z, t, center),
    };
  }

  const trackSpecs = $derived(waypoints.map((waypoint, index) => gateSpecFor(index, waypoint)));
  const trackLine = $derived(waypoints.map((waypoint) => worldPos(waypoint.translation)));
  const selectedSpec = $derived(
    selectedWaypoint ? gateSpecFor(selectedWaypoint.index, selectedWaypoint.waypoint) : undefined,
  );

  $effect(() => {
    if (!three || !gates) return;
    gates.setTrack(trackSpecs, trackLine, selectedWaypoint?.index, selectedSpec, showNum);
  });

  // ---- pointer interaction: hover, click-to-select, drag the selected gate. ----

  const _raycaster = new THREE.Raycaster();
  const _pointerNdc = new THREE.Vector2();
  const _dragPlane = new THREE.Plane();
  const _dragPoint = new THREE.Vector3();
  const _planeNormal = new THREE.Vector3(0, 1, 0);

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
    /** The grabbed gate's height — the horizontal drag plane. */
    grabY: number;
  }
  let pending: PendingPress | null = null;
  /** Latest drag position in world XZ, valid while `pending?.dragging`. */
  let dragWorld: [x: number, z: number] | null = null;
  /** A press only counts as a click when the pointer barely moved — a pan is not a click. */
  const CLICK_MAX_MOVE_PX = 5;

  function onPointerDown(event: PointerEvent): void {
    if (event.button !== 0 || !three || !gates) return;
    // Shift+left is the rotate gesture — never grab a gate with it.
    if (event.shiftKey) return;
    const hit = pickAt(event);
    if (hit && hit.index === selectedWaypoint?.index && onSelectedPointMove) {
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
    // While dragging, skip the hover pick entirely — it projects every gate per event
    // and the hovered gate can't change during a drag anyway.
    if (!pending?.dragging) {
      const hit = pickAt(event);
      gates.setHovered(hit?.index);
      return;
    }
    const rect = three.renderer.domElement.getBoundingClientRect();
    _pointerNdc.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    _raycaster.setFromCamera(_pointerNdc, three.camera);
    _dragPlane.setFromNormalAndCoplanarPoint(_planeNormal, _dragPoint.set(0, pending.grabY, 0));
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
    three = createThreeMapScene(container, {
      groundPanBlocked,
      minDistance: TRACK_EDITOR_MIN_DISTANCE_M,
    });
    const scene = three;
    gates = createTrackGates(scene.scene, scene.viewport);
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
    let maxY = -Infinity;
    for (const [x, y, z] of trackLine) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
      if (y > maxY) maxY = y;
    }
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const centerY = Math.max(maxY, 0);
    const radius = Math.max(Math.hypot(maxX - minX, maxZ - minZ) / 2, 150);
    const controls = three.controls;
    const camera = three.camera;
    controls.target.set(centerX, centerY, centerZ);
    // A hair of tilt keeps lookAt off the degenerate straight-down axis. The tilt goes
    // toward +Z (south): with a lookAt straight down, the screen-up direction ends up
    // opposite the horizontal offset — offsetting +Z projects screen-up onto world -Z,
    // i.e. north up (an +X offset would render west up).
    const distance = THREE.MathUtils.clamp(
      (radius / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.2,
      300,
      controls.maxDistance * 0.8,
    );
    camera.position.set(centerX, centerY + distance, centerZ + distance * 0.01);
    camera.lookAt(controls.target);
    controls.update();
  };
</script>

<div class={twMerge('h-full w-full', clsx(propsClass))} bind:this={container}></div>
