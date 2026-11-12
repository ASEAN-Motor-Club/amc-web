import * as THREE from 'three';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import {
  cameraProjectionMatrix,
  cameraViewMatrix,
  cos,
  float,
  instancedBufferAttribute,
  positionGeometry,
  viewportSize,
  select,
  sin,
  texture,
  uniform,
  uv,
  vec2,
  vec4,
} from 'three/tsl';

/**
 * GPU-instanced, camera-agnostic dots: every instance is a world-space anchor drawn as a quad of a
 * fixed size in DEVICE pixels, whose centre is snapped to the pixel grid. The vertex stage projects
 * the anchor with whatever camera renders (perspective or orthographic - no fov maths), converts
 * to drawing-buffer pixels, rounds, adds the corner offset and converts back, so a 1:1 atlas texel
 * lands on exactly one pixel and the dot stays crisp at any zoom, tilt or DPR.
 *
 * Instance data per slot: anchor (world xyz), opacity (0 hides the slot: it is clipped away; the
 * texture alpha is multiplied by it, so 0.5 draws a half-transparent dot), state (the atlas cell to
 * sample - normal | hover | selected) and, for `rotatable` quads, a clockwise-on-screen rotation in
 * radians about the quad's pivot.
 */
export interface ScreenQuads {
  mesh: THREE.Mesh;
  /** Writable instance data; call `commit()` after writing. Sized to at least `capacity`. */
  anchors: Float32Array;
  opacities: Float32Array;
  states: Float32Array;
  /** Per-slot rotation (radians, clockwise on screen); only meaningful for `rotatable` quads. */
  rotations: Float32Array;
  capacity: number;
  /** Grows the buffers to hold `needed` slots, preserving nothing: callers rewrite every slot. */
  ensureCapacity: (needed: number) => void;
  /** Flags every instance attribute for upload and sets the drawn instance count. */
  commit: (count: number) => void;
  /** Flags only the opacity / state attribute (single-slot writes). */
  commitOpacity: () => void;
  commitState: () => void;
  /** Swaps the atlas (a DPR change redraws it at a new device size); `sidePx` is one cell's side. */
  setAtlas: (atlas: THREE.Texture, sidePx: number) => void;
  dispose: () => void;
}

export interface ScreenQuadsOptions {
  /** Atlas of `cells` equal columns, one per state. Nearest-filtered, owned by the caller. */
  atlas: THREE.Texture;
  cells: number;
  /** One cell's side in device px. Even, so corners of a pixel-centred quad stay on pixels. */
  sidePx: number;
  renderOrder: number;
  capacity?: number;
  /** Adds the per-instance `rotations` attribute. */
  rotatable?: boolean;
  /** The point of the quad that sits on the anchor and is the rotation centre, as fractions of its
   * side from the left and from the TOP (OL's `icon-anchor`). Default: the centre. */
  pivot?: { x: number; yFromTop: number };
}

const MIN_CAPACITY = 64;

export function createScreenQuads(options: ScreenQuadsOptions): ScreenQuads {
  const { cells } = options;
  const geometry = new THREE.PlaneGeometry(1, 1);
  const side = uniform(options.sidePx);
  let atlas = options.atlas;
  let capacity = 0;

  const pivot = options.pivot ?? { x: 0.5, yFromTop: 0.5 };
  let anchors = new Float32Array(0);
  let opacities = new Float32Array(0);
  let states = new Float32Array(0);
  let rotations = new Float32Array(0);
  let anchorAttr: THREE.InstancedBufferAttribute;
  let opacityAttr: THREE.InstancedBufferAttribute;
  let stateAttr: THREE.InstancedBufferAttribute;
  let rotationAttr: THREE.InstancedBufferAttribute;
  let material: MeshBasicNodeMaterial;
  let mesh: THREE.Mesh;
  let count = 0;

  /** (Re)builds the material graph over the current attributes and atlas. */
  function buildMaterial(): MeshBasicNodeMaterial {
    const next = new MeshBasicNodeMaterial({
      transparent: true,
      depthTest: false,
      depthWrite: false,
      fog: false,
    });
    const anchor = instancedBufferAttribute<'vec3'>(anchorAttr);
    const opacity = instancedBufferAttribute<'float'>(opacityAttr);
    const state = instancedBufferAttribute<'float'>(stateAttr);

    // Anchor → drawing-buffer pixels (origin bottom-left, y up), centre snapped to a whole pixel.
    const clip = cameraProjectionMatrix.mul(cameraViewMatrix).mul(vec4(anchor, 1));
    const ndc = clip.xy.div(clip.w);
    const centre = ndc.mul(0.5).add(0.5).mul(viewportSize).round();
    // The plane is -0.5..0.5 around its centre; shift it so the pivot sits on the anchor, rotate
    // clockwise on screen (y is up in pixel space), and scale to `side` device px.
    const rel = positionGeometry.xy.add(vec2(0.5 - pivot.x, 0.5 - (1 - pivot.yFromTop)));
    let offset = rel;
    if (options.rotatable) {
      const angle = instancedBufferAttribute<'float'>(rotationAttr);
      const c = cos(angle);
      const s = sin(angle);
      offset = vec2(rel.x.mul(c).add(rel.y.mul(s)), rel.y.mul(c).sub(rel.x.mul(s)));
    }
    const pixel = centre.add(offset.mul(side));
    const out = pixel.div(viewportSize).mul(2).sub(1);
    // Hidden slots and anchors behind the camera are pushed outside the clip volume. The depth is
    // constant (0.5 is inside both GL's [-1,1] and WebGPU's [0,1] ranges): dots never depth-test.
    const visible = opacity.greaterThan(0).and(clip.w.greaterThan(0));
    next.vertexNode = select(visible, vec4(out, 0.5, 1), vec4(2, 2, 2, 1));

    const sampled = texture(
      atlas,
      uv()
        .mul(vec2(1 / cells, 1))
        .add(vec2(state.div(cells), float(0))),
    );
    next.colorNode = vec4(sampled.rgb, sampled.a.mul(opacity));
    return next;
  }

  function build(newCapacity: number): void {
    capacity = newCapacity;
    anchors = new Float32Array(capacity * 3);
    opacities = new Float32Array(capacity);
    states = new Float32Array(capacity);
    rotations = new Float32Array(capacity);
    anchorAttr = new THREE.InstancedBufferAttribute(anchors, 3);
    opacityAttr = new THREE.InstancedBufferAttribute(opacities, 1);
    stateAttr = new THREE.InstancedBufferAttribute(states, 1);
    rotationAttr = new THREE.InstancedBufferAttribute(rotations, 1);
    material = buildMaterial();
    mesh = new THREE.Mesh(geometry, material);
    // A zero-size bounding sphere would cull everything: the vertex stage owns visibility.
    mesh.frustumCulled = false;
    mesh.renderOrder = options.renderOrder;
    mesh.count = count;
  }

  build(Math.max(options.capacity ?? MIN_CAPACITY, MIN_CAPACITY));

  const handle: ScreenQuads = {
    get mesh() {
      return mesh;
    },
    get anchors() {
      return anchors;
    },
    get opacities() {
      return opacities;
    },
    get states() {
      return states;
    },
    get rotations() {
      return rotations;
    },
    get capacity() {
      return capacity;
    },
    ensureCapacity(needed) {
      if (needed <= capacity) return;
      let next = capacity;
      while (next < needed) next *= 2;
      const parent = mesh.parent;
      parent?.remove(mesh);
      material.dispose();
      build(next);
      parent?.add(mesh);
    },
    commit(newCount) {
      count = newCount;
      mesh.count = newCount;
      anchorAttr.needsUpdate = true;
      opacityAttr.needsUpdate = true;
      stateAttr.needsUpdate = true;
      rotationAttr.needsUpdate = true;
    },
    commitOpacity() {
      opacityAttr.needsUpdate = true;
    },
    commitState() {
      stateAttr.needsUpdate = true;
    },
    setAtlas(nextAtlas, sidePx) {
      atlas = nextAtlas;
      side.value = sidePx;
      // Rebuild the whole graph: it samples the (new) atlas through the same attributes.
      const old = material;
      material = buildMaterial();
      mesh.material = material;
      old.dispose();
    },
    dispose() {
      mesh.parent?.remove(mesh);
      material.dispose();
      geometry.dispose();
    },
  };
  return handle;
}
