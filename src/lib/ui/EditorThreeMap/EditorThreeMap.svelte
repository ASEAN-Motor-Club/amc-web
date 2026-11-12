<script lang="ts">
  import { untrack } from 'svelte';
  import * as THREE from 'three';
  import clsx from 'clsx';
  import { twMerge } from 'tailwind-merge';
  import type { ClassValue } from 'svelte/elements';
  import type { Vector2, Vector3 } from '#lib/types/index.ts';
  import type { MapViewState } from '#lib/ui/ThreeMap/view.ts';
  import type { Waypoint } from '#lib/schema/track.ts';
  import { Quaternion } from 'quaternion';
  import {
    createThreeMapScene,
    type MapViewKind,
    type OrthoThreeMapScene,
    type PerspectiveThreeMapScene,
  } from '#lib/ui/ThreeMap/scene.ts';
  import {
    ORTHO_MAX_ZOOM,
    ORTHO_ZOOM_BUTTON_LOG_STEP,
    TRACK_EDITOR_MIN_DISTANCE_M,
    ZOOM_BUTTON_LOG_STEP,
  } from '#lib/ui/ThreeMap/constants.ts';
  import { TILES_META } from '#lib/ui/ThreeMap/heightmap.ts';
  import { gameCoordToWorld, worldXZToGamePlane } from '#lib/ui/ThreeMap/coords.ts';
  import { zoomToFitExtent } from '#lib/ui/ThreeMap/view.ts';
  import { getViewBufferSize } from '#lib/ui/ThreeMap/viewRect.ts';
  import MapZoomControl from '#lib/ui/MapZoomControl/MapZoomControl.svelte';
  import { WP_EULER_ORDER } from '#lib/components/TrackEditor/utils/index.ts';
  import { createTrackGates, type GateSpec, type TrackGates } from './trackGates.ts';
  import { createTrackFlat, type TrackFlat, type TrackPoint } from './trackFlat.ts';

  export interface EditorThreeMapProps {
    /** The class to apply to the map element */
    class?: ClassValue;
    /** `perspective` (default): the 3D terrain with box gates. `ortho`: the flat 2D map with OL's
     * track styling (dots + heading arrows, or flat gate lines in `gateMode`). Switching it
     * re-creates the scene where the old one was looking. */
    view?: MapViewKind;
    /** 2D only: draw each point as a flat gate line instead of a dot and arrow. */
    gateMode?: boolean;
    /** Centre and zoom to open at, e.g. one captured with `getViewState` before an unmount. */
    initialView?: MapViewState;
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
    view = 'perspective',
    gateMode = false,
    initialView,
    waypoints,
    selectedWaypoint,
    showNum = false,
    onPointClick,
    onSelectedPointMove,
  }: EditorThreeMapProps = $props();

  let container: HTMLDivElement;
  let three = $state<PerspectiveThreeMapScene | OrthoThreeMapScene | undefined>(undefined);
  /** Exactly one of these exists, per the scene's view. */
  let gates = $state<TrackGates | undefined>(undefined);
  let flat = $state<TrackFlat | undefined>(undefined);

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
    three.invalidate();
  });

  /** The flat editor's view of a waypoint: where it is, which way it faces, how wide its gate is. */
  const trackPointOf = (waypoint: Waypoint): TrackPoint => ({
    coord: waypoint.translation,
    yaw: new Quaternion(waypoint.rotation).toEuler(WP_EULER_ORDER)[2],
    scaleY: waypoint.scale3D.y,
  });
  const flatPoints = $derived(waypoints.map(trackPointOf));
  const flatSelected = $derived(
    selectedWaypoint
      ? { index: selectedWaypoint.index, ...trackPointOf(selectedWaypoint.waypoint) }
      : undefined,
  );

  $effect(() => {
    if (!three || !flat) return;
    flat.setTrack(flatPoints, flatSelected, gateMode, showNum);
    three.invalidate();
    if (fitPending) zoomFit();
  });

  // ---- pointer interaction: hover, click-to-select, drag the selected gate / dot. ----

  const _raycaster = new THREE.Raycaster();
  const _pointerNdc = new THREE.Vector2();
  const _dragPlane = new THREE.Plane();
  const _dragPoint = new THREE.Vector3();
  const _planeNormal = new THREE.Vector3(0, 1, 0);

  /** The pointer in canvas CSS px. */
  function canvasPos(
    event: { clientX: number; clientY: number },
    canvas: HTMLElement,
  ): [x: number, y: number] {
    const rect = canvas.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top];
  }

  /** The point (3D: gate) under the pointer, or null; `grabY` is its height - the drag plane. */
  function pickAt(event: {
    clientX: number;
    clientY: number;
  }): { index: number; grabY: number } | null {
    if (!three) return null;
    if (flat) {
      const [x, y] = canvasPos(event, three.renderer.domElement);
      const index = flat.pick(x, y);
      return index === undefined ? null : { index, grabY: 0 };
    }
    if (!gates || three.view !== 'perspective') return null;
    const rect = three.renderer.domElement.getBoundingClientRect();
    _pointerNdc.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    const hit = gates.pick(_pointerNdc.x, _pointerNdc.y, three.camera, rect.width, rect.height);
    return hit ? { index: hit.index, grabY: hit.world.y } : null;
  }

  /** Whether the pointer is on the thing a drag would move: the selected overlay. */
  function onSelected(event: { clientX: number; clientY: number }, hit: { index: number } | null) {
    if (flat && three) return flat.grabsSelected(...canvasPos(event, three.renderer.domElement));
    return hit !== null && hit.index === selectedWaypoint?.index;
  }

  /** The pointer's position on the horizontal plane at height `y`, world coordinates. */
  function groundAt(
    event: { clientX: number; clientY: number },
    y: number,
  ): THREE.Vector3 | undefined {
    if (!three) return undefined;
    const rect = three.renderer.domElement.getBoundingClientRect();
    _pointerNdc.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    _raycaster.setFromCamera(_pointerNdc, three.camera);
    _dragPlane.setFromNormalAndCoplanarPoint(_planeNormal, _dragPoint.set(0, y, 0));
    return _raycaster.ray.intersectPlane(_dragPlane, _dragPoint) ?? undefined;
  }

  /**
   * Presses on a point belong to the editor (click-to-select or a drag), not to the ground
   * pan — groundPan queries this inside its own pointerdown, which runs before ours.
   */
  const groundPanBlocked = (event: PointerEvent): boolean => {
    const hit = pickAt(event);
    return hit !== null || onSelected(event, hit);
  };

  interface PendingPress {
    /** The point pressed, or undefined for empty map (a click there deselects). */
    index: number | undefined;
    clientX: number;
    clientY: number;
    /** True when the press grabbed the selected overlay. */
    dragging: boolean;
    /** The grabbed point's height — the horizontal drag plane. */
    grabY: number;
  }
  let pending: PendingPress | null = null;
  /** Latest drag position in world XZ, valid while `pending?.dragging`. */
  let dragWorld: [x: number, z: number] | null = null;
  /** A press only counts as a click when the pointer barely moved — a pan is not a click. */
  const CLICK_MAX_MOVE_PX = 5;

  function onPointerDown(event: PointerEvent): void {
    if (event.button !== 0 || !three || !(gates || flat)) return;
    // Shift+left is the rotate gesture (3D) / box zoom (2D) — never grab a point with it.
    if (event.shiftKey) return;
    const hit = pickAt(event);
    if (onSelected(event, hit) && onSelectedPointMove) {
      pending = {
        index: hit?.index ?? selectedWaypoint?.index,
        clientX: event.clientX,
        clientY: event.clientY,
        dragging: true,
        grabY: hit?.grabY ?? 0,
      };
      dragWorld = null;
      if (flat) {
        const ground = groundAt(event, 0);
        if (ground) flat.beginDrag(ground.x, ground.z);
      }
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
    if (!three || !(gates || flat)) return;
    // While dragging, skip the hover pick entirely — it projects every point per event
    // and the hovered point can't change during a drag anyway.
    if (!pending?.dragging) {
      const index = pickAt(event)?.index;
      gates?.setHovered(index);
      flat?.setHovered(index);
      three.invalidate();
      return;
    }
    const ground = groundAt(event, pending.grabY);
    if (!ground) return;
    dragWorld = flat ? flat.dragTo(ground.x, ground.z) : [ground.x, ground.z];
    gates?.dragTo(ground.x, ground.z);
    three.invalidate();
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
      // Commit once, on release; a press without a move leaves the point (and the dirty flag) alone.
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
    flat?.setHovered(undefined);
    three?.invalidate();
  }

  /** Where the map was looking when the scene it belonged to was torn down: a view switch
   * re-creates the scene (a scene's camera type is fixed) and reopens at the same place. */
  let carriedView: MapViewState | undefined = untrack(() => initialView);

  $effect(() => {
    const options = {
      groundPanBlocked,
      minDistance: TRACK_EDITOR_MIN_DISTANCE_M,
      initialView: carriedView,
    };
    const scene =
      view === 'ortho'
        ? createThreeMapScene(container, { ...options, view: 'ortho' })
        : createThreeMapScene(container, { ...options, view: 'perspective' });
    three = scene;
    const buffer = new THREE.Vector2();
    if (scene.view === 'ortho') {
      flat = createTrackFlat({
        scene: scene.scene,
        meta: TILES_META,
        camera: scene.camera,
        size: () => ({
          width: scene.renderer.domElement.clientWidth,
          height: scene.renderer.domElement.clientHeight,
        }),
        getViewport: scene.viewport,
      });
    } else {
      gates = createTrackGates(scene.scene, scene.viewport);
    }
    if (fitPending && scene.view === 'perspective') zoomFit();
    const unregisterFrame = scene.onFrame(() => {
      getViewBufferSize(scene.renderer, buffer);
      if (scene.view === 'perspective') gates?.update(scene.camera, buffer);
      flat?.update(buffer);
    });
    const unregisterResize = scene.onResize(() => {
      gates?.refit();
      flat?.refit();
    });
    const dom = scene.renderer.domElement;
    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('pointerleave', onPointerLeave);

    return () => {
      carriedView = scene.getViewState();
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('pointermove', onPointerMove);
      dom.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('pointerleave', onPointerLeave);
      unregisterFrame();
      unregisterResize();
      gates?.dispose();
      gates = undefined;
      flat?.dispose();
      flat = undefined;
      scene.dispose();
      three = undefined;
      pending = null;
      dragWorld = null;
    };
  });

  /** Snapshot of where the map is looking, to hand back as `initialView` after a remount. */
  export const getViewState = (): MapViewState | undefined => three?.getViewState();

  /** OL's `fit` padding and duration (4 x the default transition). */
  const FIT_PADDING_PX = 64;
  const FIT_DURATION_S = 0.6;

  function zoomFitFlat(scene: OrthoThreeMapScene, track: TrackFlat): void {
    const bounds = track.bounds();
    if (!bounds) return;
    const zoom = zoomToFitExtent(
      { widthMeters: bounds.maxX - bounds.minX, heightMeters: bounds.maxZ - bounds.minZ },
      { width: container.clientWidth, height: container.clientHeight },
      FIT_PADDING_PX,
      ORTHO_MAX_ZOOM,
    );
    scene.ortho.animateTo(
      { x: (bounds.minX + bounds.maxX) / 2, z: (bounds.minZ + bounds.maxZ) / 2, zoom },
      FIT_DURATION_S,
    );
  }

  /** A fit asked for before the scene or its first draw exists runs as soon as both do. */
  let fitPending = false;

  export const zoomFit = (): void => {
    if (!three) {
      fitPending = true;
      return;
    }
    if (three.view === 'ortho') {
      // The bounds come from what is drawn, which lands one effect after the scene is created.
      if (!flat?.bounds()) {
        fitPending = waypoints.length > 0;
        return;
      }
      fitPending = false;
      zoomFitFlat(three, flat);
      return;
    }
    fitPending = false;
    if (trackLine.length === 0) return;
    const scene = three;
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
    const controls = scene.controls;
    const camera = scene.camera;
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

  // Positive steps zoom out; 2D: one whole zoom level, like OL's +/- control.
  const zoomStep = $derived(view === 'ortho' ? ORTHO_ZOOM_BUTTON_LOG_STEP : ZOOM_BUTTON_LOG_STEP);
</script>

<div class="relative h-full w-full">
  <div class={twMerge('h-full w-full', clsx(propsClass))} bind:this={container}></div>
  {#if view === 'ortho'}
    <div class="absolute right-4 bottom-4">
      <MapZoomControl
        onZoomIn={() => three?.stepBy(zoomStep)}
        onZoomOut={() => three?.stepBy(-zoomStep)}
      />
    </div>
  {/if}
</div>
