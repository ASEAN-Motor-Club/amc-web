import * as THREE from 'three';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import {
  cameraNear,
  cameraProjectionMatrix,
  cameraViewMatrix,
  clamp,
  float,
  instancedBufferAttribute,
  length,
  max,
  min,
  mix,
  mod,
  positionGeometry,
  viewportSize,
  select,
  smoothstep,
  time,
  uniform,
  varying,
  vec2,
  vec4,
} from 'three/tsl';

/**
 * Constant-pixel-width lines, instanced one quad per segment, with anti-aliased round caps and an
 * optional dash pattern whose phase flows with time (or flat `butt` ends). Everything is measured on screen (device px):
 * the vertex stage projects both ends with the active camera, builds the quad around the screen
 * segment, and the fragment stage evaluates a capsule distance field - so width, dash length and
 * flow speed look identical at any zoom, tilt or DPR, and alpha blends normally (three's own
 * `Line2NodeMaterial` blends by re-reading the framebuffer and its dashes live in world units).
 *
 * Instance data per segment: start/end (world xyz), colour (rgba, straight alpha) and the
 * cumulative world distance at the start (so a dash pattern runs continuously around a polyline).
 */
export interface ScreenLinesOptions {
  renderOrder: number;
  /** Line width in CSS px. */
  widthCss: number;
  /** Device px per CSS px - the line is measured in device px. */
  dpr: number;
  /** Dash/gap in CSS px; omit for a solid line. */
  dash?: { dashCss: number; gapCss: number };
  /** Pattern travel in CSS px per second (0 = static). Only meaningful with `dash`. */
  flowCssPerSecond?: number;
  /** End shape of each segment: `round` (default) or a flat `butt` that stops exactly at the ends. */
  cap?: 'round' | 'butt';
}

export interface ScreenLines {
  mesh: THREE.Mesh;
  /** Replaces every segment. `colors` are rgba (0..1); `distances` the world distance at each start. */
  setSegments: (
    starts: Float32Array,
    ends: Float32Array,
    colors: Float32Array,
    distances: Float32Array,
  ) => void;
  setDpr: (dpr: number) => void;
  /**
   * Dashed lines only: recomputes each segment's dash phase as the screen-space length of the
   * polyline before it, so the pattern is continuous across segment joints under perspective.
   * Call once per rendered frame, before rendering; a no-op while neither the camera nor the
   * segments changed. `buffer` is the drawing-buffer size in device px.
   */
  syncDashPhase: (
    camera: THREE.PerspectiveCamera | THREE.OrthographicCamera,
    buffer: THREE.Vector2,
  ) => void;
  setFlow: (cssPerSecond: number) => void;
  dispose: () => void;
}

const MIN_CAPACITY = 64;
/** Anti-alias fringe in device px added around the line, so the SDF edge is never clipped. */
const AA_PAD_PX = 1;

export function createScreenLines(options: ScreenLinesOptions): ScreenLines {
  const geometry = new THREE.PlaneGeometry(1, 1);
  const dprU = uniform(options.dpr);
  const widthU = uniform(options.widthCss);
  const flowU = uniform(options.flowCssPerSecond ?? 0);
  const dash = options.dash;

  let capacity = 0;
  let startAttr: THREE.InstancedBufferAttribute;
  let endAttr: THREE.InstancedBufferAttribute;
  let colorAttr: THREE.InstancedBufferAttribute;
  let phaseAttr: THREE.InstancedBufferAttribute;
  let material: MeshBasicNodeMaterial;
  let mesh: THREE.Mesh;
  let count = 0;
  // What `syncDashPhase` walks: the caller's segment arrays, kept as given.
  let cpuStarts: Float32Array = new Float32Array();
  let cpuEnds: Float32Array = new Float32Array();
  let cpuDistances: Float32Array = new Float32Array();
  let phaseDirty = false;
  /** View-projection (16) and buffer size (2) the phases were last computed for. */
  const phaseKey = new Float32Array(18);
  const viewProjMatrix = new THREE.Matrix4();

  function buildMaterial(): MeshBasicNodeMaterial {
    const next = new MeshBasicNodeMaterial({
      transparent: true,
      depthTest: false,
      depthWrite: false,
      fog: false,
    });
    const start = instancedBufferAttribute<'vec3'>(startAttr);
    const end = instancedBufferAttribute<'vec3'>(endAttr);
    const color = instancedBufferAttribute<'vec4'>(colorAttr);
    const phase = instancedBufferAttribute<'float'>(phaseAttr);

    const viewProj = cameraProjectionMatrix.mul(cameraViewMatrix);
    const clipS0 = viewProj.mul(vec4(start, 1));
    const clipE0 = viewProj.mul(vec4(end, 1));
    // A segment with an end behind the camera is trimmed to just in front of the near plane (in
    // clip space the projection keeps lines straight, so the visible part is exact); dropped only
    // when both ends are behind. Half the near plane keeps the trimmed end's pixel position
    // finite, and stays under an orthographic camera's constant w of 1 (its near is 1).
    const nearW = cameraNear.mul(0.5);
    const startBehind = clipS0.w.lessThanEqual(nearW);
    const endBehind = clipE0.w.lessThanEqual(nearW);
    const wSpan = clipE0.w.sub(clipS0.w);
    const safeSpan = select(wSpan.abs().greaterThan(1e-6), wSpan, float(1e-6));
    const tCut = nearW.sub(clipS0.w).div(safeSpan);
    const tStart = select(startBehind, tCut, float(0));
    const tEnd = select(endBehind, tCut, float(1));
    const inFront = startBehind.and(endBehind).not();
    const clipS = mix(clipS0, clipE0, tStart);
    const clipE = mix(clipS0, clipE0, tEnd);

    const pxS = clipS.xy.div(clipS.w).mul(0.5).add(0.5).mul(viewportSize);
    const pxE = clipE.xy.div(clipE.w).mul(0.5).add(0.5).mul(viewportSize);
    const delta = pxE.sub(pxS);
    const lenPx = max(length(delta), 1e-4);
    const dir = delta.div(lenPx);
    const perp = vec2(dir.y.negate(), dir.x);

    const halfW = widthU.mul(dprU).mul(0.5);
    const pad = halfW.add(AA_PAD_PX);
    // Plane x ∈ [-0.5,0.5] runs along the segment, y across it.
    const along = positionGeometry.x.add(0.5);
    const side = positionGeometry.y.mul(2);
    const capSign = along.sub(0.5).mul(2);
    const corner = mix(pxS, pxE, along)
      .add(dir.mul(pad.mul(capSign)))
      .add(perp.mul(pad.mul(side)));
    const out = corner.div(viewportSize).mul(2).sub(1);
    next.vertexNode = select(inFront, vec4(out, 0.5, 1), vec4(2, 2, 2, 1));

    // Fragment inputs, all in device px: this fragment, the segment, and the dash phase.
    const vFrag = varying(corner);
    const vStart = varying(pxS);
    const vDir = varying(dir);
    const vLen = varying(lenPx);
    // The dash phase at the visible start, in px along the line: `syncDashPhase` accumulates it
    // in screen space, so the pattern runs unbroken across a polyline's joints.
    const vDistPx = varying(phase);
    const vColor = varying(color);

    const rel = vFrag.sub(vStart);
    const u = rel.x.mul(vDir.x).add(rel.y.mul(vDir.y));
    const v = rel.x.mul(vDir.y.negate()).add(rel.y.mul(vDir.x));
    const outside = max(float(0), max(u.negate(), u.sub(vLen)));

    let alongDist = outside;
    if (dash) {
      const dashPx = dprU.mul(dash.dashCss);
      const cycle = dprU.mul(dash.dashCss + dash.gapCss);
      // Pattern coordinate: flows toward the segment start as time grows (OL's negative offset).
      const pattern = u.add(vDistPx).add(flowU.mul(dprU).mul(time));
      const m = mod(pattern, cycle);
      // Distance along the axis to the nearest dash [0, dash] of this or the previous cycle.
      const toDash = m.sub(clamp(m, 0, dashPx)).abs();
      const toPrev = m
        .sub(cycle)
        .sub(clamp(m.sub(cycle), 0, dashPx))
        .abs();
      alongDist = max(outside, min(toDash, toPrev));
    }
    let coverage;
    if (options.cap === 'butt') {
      // A rectangle: the ends cut straight at the segment ends (signed distance inside, 1px fringe).
      const acrossCoverage = smoothstep(halfW.add(0.5), halfW.sub(0.5), v.abs());
      coverage = acrossCoverage.mul(clamp(min(u, vLen.sub(u)).add(0.5), 0, 1));
    } else {
      coverage = smoothstep(halfW.add(0.5), halfW.sub(0.5), length(vec2(alongDist, v)));
    }
    next.colorNode = vec4(vColor.rgb, vColor.a.mul(coverage));
    return next;
  }

  function build(newCapacity: number): void {
    capacity = newCapacity;
    startAttr = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    endAttr = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    colorAttr = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
    phaseAttr = new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1);
    phaseDirty = true;
    material = buildMaterial();
    mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.renderOrder = options.renderOrder;
    mesh.count = count;
  }

  build(MIN_CAPACITY);

  return {
    get mesh() {
      return mesh;
    },
    setSegments(starts, ends, colors, distances) {
      const n = distances.length;
      if (n > capacity) {
        let next = capacity;
        while (next < n) next *= 2;
        const parent = mesh.parent;
        parent?.remove(mesh);
        material.dispose();
        build(next);
        parent?.add(mesh);
      }
      (startAttr.array as Float32Array).set(starts);
      (endAttr.array as Float32Array).set(ends);
      (colorAttr.array as Float32Array).set(colors);
      for (const attr of [startAttr, endAttr, colorAttr]) attr.needsUpdate = true;
      cpuStarts = starts;
      cpuEnds = ends;
      cpuDistances = distances;
      phaseDirty = true;
      count = n;
      mesh.count = n;
    },
    syncDashPhase(camera, buffer) {
      if (!dash || count === 0) return;
      camera.updateMatrixWorld();
      viewProjMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      const e = viewProjMatrix.elements;
      let changed = phaseDirty || buffer.x !== phaseKey[16] || buffer.y !== phaseKey[17];
      for (let i = 0; i < 16 && !changed; i++) changed = e[i] !== phaseKey[i];
      if (!changed) return;
      phaseKey.set(e);
      phaseKey[16] = buffer.x;
      phaseKey[17] = buffer.y;
      phaseDirty = false;

      const phases = phaseAttr.array as Float32Array;
      const nearW = camera.near * 0.5;
      let travelled = 0;
      for (let k = 0; k < count; k++) {
        // A polyline's first segment starts at world distance 0; the rest continue its pattern.
        if (cpuDistances[k] === 0) travelled = 0;
        phases[k] = travelled;
        const i = k * 3;
        const [sx, sy, sz] = [cpuStarts[i], cpuStarts[i + 1], cpuStarts[i + 2]];
        const [ex, ey, ez] = [cpuEnds[i], cpuEnds[i + 1], cpuEnds[i + 2]];
        const wS = e[3] * sx + e[7] * sy + e[11] * sz + e[15];
        const wE = e[3] * ex + e[7] * ey + e[11] * ez + e[15];
        const startBehind = wS <= nearW;
        const endBehind = wE <= nearW;
        if (startBehind && endBehind) continue;
        // Same trim as the vertex stage, so the visible part's length matches what is drawn.
        const span = wE - wS;
        const cut = (nearW - wS) / (Math.abs(span) > 1e-6 ? span : 1e-6);
        const tStart = startBehind ? cut : 0;
        const tEnd = endBehind ? cut : 1;
        const xS = e[0] * sx + e[4] * sy + e[8] * sz + e[12];
        const yS = e[1] * sx + e[5] * sy + e[9] * sz + e[13];
        const xE = e[0] * ex + e[4] * ey + e[8] * ez + e[12];
        const yE = e[1] * ex + e[5] * ey + e[9] * ez + e[13];
        const w0 = wS + span * tStart;
        const w1 = wS + span * tEnd;
        const dx = ((xS + (xE - xS) * tEnd) / w1 - (xS + (xE - xS) * tStart) / w0) * 0.5 * buffer.x;
        const dy = ((yS + (yE - yS) * tEnd) / w1 - (yS + (yE - yS) * tStart) / w0) * 0.5 * buffer.y;
        travelled += Math.hypot(dx, dy);
      }
      phaseAttr.needsUpdate = true;
    },
    setDpr(dpr) {
      dprU.value = dpr;
    },
    setFlow(cssPerSecond) {
      flowU.value = cssPerSecond;
    },
    dispose() {
      mesh.parent?.remove(mesh);
      material.dispose();
      geometry.dispose();
    },
  };
}
