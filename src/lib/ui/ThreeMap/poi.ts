import * as THREE from 'three';
import { SpriteNodeMaterial, type NodeBuilder, type Renderer } from 'three/webgpu';
import { modelScale, modelViewMatrix, positionGeometry, reference, vec4 } from 'three/tsl';
import { formatHex, parse } from 'culori';
import type { PoiDotStyle } from './constants.ts';
import { getViewBufferSize } from './viewRect.ts';

/** Converts any CSS colour string (oklch(), lab(), ...) to hex via culori; white if unparseable. */
const convertToHex = (css: string): string => formatHex(parse(css)) ?? '#fff';

/** Reads a hex number or a CSS colour string; three's Color cannot parse oklch()/lab(). */
export function makeColor(color: string | number): THREE.Color {
  return typeof color === 'string' && /^(oklch|lab)\(/.test(color)
    ? new THREE.Color(convertToHex(color))
    : new THREE.Color(color);
}

/**
 * The RGB triple to feed a GPU buffer for `color`. A normal (3D) scene works in linear light and
 * lets the output pass encode it; the flat 2D scene is display-referred - it renders straight to
 * the canvas so blending happens on sRGB-encoded values exactly like OL's canvas - and needs the
 * encoded numbers.
 */
export function colorComponents(
  color: THREE.Color,
  displayReferred: boolean,
): [r: number, g: number, b: number] {
  if (!displayReferred) return [color.r, color.g, color.b];
  const { r, g, b } = color.getRGB(new THREE.Color(), THREE.SRGBColorSpace);
  return [r, g, b];
}

/** A Color that reads back as `color` through a display-referred pipeline (clear colour, scene
 * background): its working components are the sRGB-encoded numbers. */
export function makeDisplayColor(color: string | number): THREE.Color {
  const [r, g, b] = colorComponents(makeColor(color), true);
  return new THREE.Color().setRGB(r, g, b, THREE.LinearSRGBColorSpace);
}

/** Default outline thickness in CSS px - OL's circle-stroke-width when unspecified. */
export const DEFAULT_DOT_STROKE_CSS_PX = 1;
/** Device-px margin around the outer stroke edge so the AA fringe survives linear filtering. */
const DOT_AA_PAD_PX = 2;

export interface ViewportScale {
  /** Device px per CSS px on the drawing surface. */
  dpr: number;
  /** The renderer draws straight to the canvas with no output colour conversion (the 2D scene):
   * baked textures stay raw sRGB bytes and buffer colours must be sRGB-encoded numbers. */
  displayReferred: boolean;
  /** Device px covered by one world unit for a sizeAttenuation:false sprite (any camera type). */
  pxPerWorld: number;
}

const _bufferSize = new THREE.Vector2();

/**
 * Device px covered by one world unit for a sizeAttenuation:false sprite: its NDC extent is
 * scale * projection[1][1] (perspective: three multiplies the scale by view depth, which the
 * projection divide cancels; orthographic: the scale is used as-is), so one world unit spans
 * P11 * bufferHeight / 2 px. The same expression holds for both camera types.
 */
export function pxPerWorldUnit(camera: THREE.Camera, bufferHeight: number): number {
  return Math.max((camera.projectionMatrix.elements[5] * bufferHeight) / 2, 1e-6);
}

/** Sprite screen metrics for the current view rectangle (see `viewRect.ts`). */
export function viewportScale(camera: THREE.Camera, renderer: Renderer): ViewportScale {
  getViewBufferSize(renderer, _bufferSize);
  return {
    dpr: renderer.getPixelRatio(),
    displayReferred: renderer.outputColorSpace === THREE.LinearSRGBColorSpace,
    pxPerWorld: pxPerWorldUnit(camera, _bufferSize.y),
  };
}

/** Palette signature - identical palettes share one instanced sprite group. */
export function dotPaletteKey(palette: PoiDotStyle): string {
  return `${palette.fill}|${palette.stroke}|${palette.strokeWidth ?? DEFAULT_DOT_STROKE_CSS_PX}`;
}

/** Dot visual state - indexes the atlas cell, mirroring OL's `hover`/`selected` attribute switches. */
export const enum PoiState {
  Normal = 0,
  Hover = 1,
  Selected = 2,
}

/** Cells in each dot atlas, laid out side by side along U: normal | hover | selected. */
export const DOT_ATLAS_CELLS = 3;

/** Resolved cell colors: the base palette with the state's overrides applied. */
function dotCellColors(palette: PoiDotStyle, state: PoiState): { fill: string; stroke: string } {
  const override =
    state === PoiState.Hover
      ? palette.hover
      : state === PoiState.Selected
        ? palette.selected
        : undefined;
  return { fill: override?.fill ?? palette.fill, stroke: override?.stroke ?? palette.stroke };
}

/** Outline thickness in CSS px - OL's circle-stroke-width when unspecified. */
export function dotStrokeCssPx(palette: PoiDotStyle): number {
  return palette.strokeWidth ?? DEFAULT_DOT_STROKE_CSS_PX;
}

/** Canvas side in device px: the stroke-cleared dot at native size plus an AA margin. */
export function dotCanvasSidePx(palette: PoiDotStyle, viewport: ViewportScale): number {
  const radiusDevice = (palette.diameterPx / 2) * viewport.dpr;
  const strokeDevice = dotStrokeCssPx(palette) * viewport.dpr;
  const side = Math.ceil(2 * (radiusDevice + strokeDevice / 2 + DOT_AA_PAD_PX));
  // Even, so a centred quad's corners land on whole device pixels.
  return side + (side & 1);
}

/**
 * One dot ATLAS texture per distinct palette, drawn at its native on-screen device size
 * (plus stroke and AA padding) for the given viewport - no downsampling, no shimmer. Each
 * instanced sprite renders a single texture, so the dot always samples its own cell - no
 * per-instance UV, which is what keeps instancing reliable across marker types. The atlas
 * packs the three visual states side by side (`PoiState`); a per-instance UV shift in
 * poiManager picks the cell. Remake on DPR changes (with dotSpriteScale for the matching
 * scale); an unchanged DPR keeps the canvas across window resizes - only the sprite scale
 * follows the buffer height.
 */
export function makeDotAtlasTexture(
  palette: PoiDotStyle,
  viewport: ViewportScale,
): THREE.CanvasTexture {
  const side = dotCanvasSidePx(palette, viewport);
  const canvas = document.createElement('canvas');
  canvas.width = side * DOT_ATLAS_CELLS;
  canvas.height = side;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context for dot');
  for (const state of [PoiState.Normal, PoiState.Hover, PoiState.Selected]) {
    const { fill, stroke } = dotCellColors(palette, state);
    const cx = state * side + side / 2;
    ctx.beginPath();
    ctx.arc(cx, side / 2, (palette.diameterPx / 2) * viewport.dpr, 0, Math.PI * 2);
    ctx.fillStyle = makeColor(fill).getStyle();
    ctx.fill();
    ctx.lineWidth = dotStrokeCssPx(palette) * viewport.dpr;
    ctx.strokeStyle = makeColor(stroke).getStyle();
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = viewport.displayReferred ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  return texture;
}

export interface LabelStyle {
  /** CSS font weight, e.g. 600. */
  weight: number;
  /** Text height in CSS px. */
  sizeCss: number;
  /** CSS font-family list. */
  family: string;
  fillStyle: string;
  strokeStyle: string;
  /** Outline thickness in CSS px. */
  strokeWidthCss: number;
  /** Where the sprite's position sits: `above` (default) hangs the glyphs `liftCss` over it,
   * bottom-centre anchored, for labels on a dot; `center` centres the glyphs on it, for names
   * drawn over an area or zone. */
  anchor?: 'above' | 'center';
  /** Glyph-centre height above the anchor for `above` labels, CSS px (OL's text `offsetY`). */
  liftCss?: number;
}

export interface TextSprite {
  sprite: THREE.Sprite;
  /** The text and style the sprite was built from - remade on DPR changes. */
  text: string;
  style: LabelStyle;
  /** Canvas size in device px - rescale with viewportScale.pxPerWorld on viewport changes. */
  widthDevice: number;
  heightDevice: number;
  /** Fraction of the canvas height below the sprite position: 0 (bottom-anchored) or 0.5 (centred). */
  anchorY: number;
}

/** Device-px margin around the glyph ink so the AA fringe survives linear filtering. */
const LABEL_AA_PAD_PX = 2;
/** Default glyph-centre height above the sprite's bottom anchor, in CSS px. */
const LABEL_LIFT_CSS_PX = 15;

/**
 * three's `SpriteNodeMaterial` reads `sprite.center` through `reference('center', 'vec2', object)`
 * bound to the object it was first built for, and the node-builder state is shared by every sprite
 * with matching material settings - so all labels would take the centre of whichever label was
 * built first (a centred area name pulled dot labels onto their dots). This is
 * `setupPositionView` reduced to what labels use (constant screen size, no rotation) with the
 * reference left unbound, so each sprite's own centre is read per rendered object.
 * Re-check against `SpriteNodeMaterial.setupPositionView` when upgrading three.
 */
class LabelSpriteMaterial extends SpriteNodeMaterial {
  override setupPositionView(builder: NodeBuilder & { camera: THREE.Camera }) {
    const mvPosition = modelViewMatrix.mul(vec4(0, 0, 0, 1));
    const objectScale = modelScale.xy;
    // sizeAttenuation is false: a perspective sprite scales with its depth to stay a constant size.
    const scale = (builder.camera as THREE.PerspectiveCamera).isPerspectiveCamera
      ? objectScale.mul(mvPosition.z.negate())
      : objectScale;
    // A null object makes the reference follow the object being rendered.
    const center = reference('center', 'vec2', null as unknown as object);
    const aligned = positionGeometry.xy.sub(center.sub(0.5)).mul(scale);
    return vec4(mvPosition.xy.add(aligned), mvPosition.zw);
  }
}

/**
 * A text sprite always facing the camera, kept at a constant screen size. Text is drawn the way
 * OL's canvas text was - `textAlign: center`, `textBaseline: middle` at the label's anchor point -
 * so glyphs sit exactly where OL put them regardless of descenders. Ink is measured and packed at
 * native device size, so remake it when the DPR changes.
 */
export function makeTextSprite(
  text: string,
  style: LabelStyle,
  viewport: ViewportScale,
): TextSprite {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context for text');
  const font = `${style.weight} ${style.sizeCss * viewport.dpr}px ${style.family}`;
  // Fetch the font subset this text needs; if it was not loaded yet the scene redraws every label
  // when it arrives (`watchFontLoads`). A no-op once loaded.
  void document.fonts.load(font, text);
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const ink = ctx.measureText(text);
  const halfW = Math.max(ink.actualBoundingBoxLeft, ink.actualBoundingBoxRight);
  const ascent = ink.actualBoundingBoxAscent;
  const descent = ink.actualBoundingBoxDescent;
  const strokeDevice = style.strokeWidthCss * viewport.dpr;
  const pad = strokeDevice / 2 + LABEL_AA_PAD_PX;
  // The anchor point (where OL drew the text) is the canvas centre horizontally; the width is even
  // so that half-width is a whole pixel (see snapLabelToPixelGrid).
  const width = Math.ceil((halfW + pad) * 2);
  canvas.width = width + (width & 1);
  const centered = style.anchor === 'center';
  const lift = (style.liftCss ?? LABEL_LIFT_CSS_PX) * viewport.dpr;
  // Centred: the anchor is the canvas centre. Above: the anchor sits `lift` over the bottom edge.
  const height = centered
    ? Math.ceil(Math.max(ascent, descent) * 2 + pad * 2)
    : Math.ceil(Math.max(lift + ascent + pad, lift + descent + pad));
  // Even too: a centred quad's half-height is then a whole pixel.
  canvas.height = height + (height & 1);
  const anchorY = centered ? canvas.height / 2 : canvas.height - lift;
  // Resizing the canvas resets the context - set the text state again before drawing.
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  if (strokeDevice > 0) {
    ctx.strokeStyle = style.strokeStyle;
    ctx.lineWidth = strokeDevice;
    ctx.strokeText(text, canvas.width / 2, anchorY);
  }
  ctx.fillStyle = style.fillStyle;
  ctx.fillText(text, canvas.width / 2, anchorY);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = viewport.displayReferred ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  // The sprite is snapped so every texel lands on one device pixel: nearest keeps the glyph
  // edges as sharp as the canvas rasterised them.
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  const material = new LabelSpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    // Constant screen size regardless of camera distance.
    sizeAttenuation: false,
    // Render above the dots and the terrain.
    depthTest: false,
  });
  const sprite = new THREE.Sprite(material);
  const spriteAnchorY = centered ? 0.5 : 0;
  sprite.center.set(0.5, spriteAnchorY);
  sprite.renderOrder = 2;
  // Map the canvas 1:1 onto device pixels (sizeAttenuation:false: NDC extent = scale*f).
  sprite.scale.set(canvas.width / viewport.pxPerWorld, canvas.height / viewport.pxPerWorld, 1);
  return {
    sprite,
    text,
    style,
    widthDevice: canvas.width,
    heightDevice: canvas.height,
    anchorY: spriteAnchorY,
  };
}

const _snapPos = new THREE.Vector3();

/**
 * Nudges a label sprite (anchored at its position, see `LabelStyle.anchor`) so its quad corners sit on whole
 * device pixels, the only way a 1:1 canvas texture stays crisp: a quad that lands between pixels
 * is resampled and blurs, and the perspective projection puts it between pixels almost always.
 * Works through `sprite.center`, so the world position stays the true anchor. `buffer` is the
 * drawing buffer size in device px; call after the camera's matrices are current.
 */
export function snapLabelToPixelGrid(
  label: TextSprite,
  camera: THREE.Camera,
  buffer: THREE.Vector2,
): void {
  const { sprite, widthDevice, heightDevice, anchorY } = label;
  _snapPos.copy(sprite.position).project(camera);
  // Behind the camera or outside the clip volume: nothing to align (and nothing visible).
  if (_snapPos.z < -1 || _snapPos.z > 1) return;
  // The sprite's world size follows the projection: constant under perspective, but an
  // orthographic zoom changes how many world units one pixel covers.
  const pxPerWorld = pxPerWorldUnit(camera, buffer.y);
  sprite.scale.set(widthDevice / pxPerWorld, heightDevice / pxPerWorld, 1);
  const px = (_snapPos.x * 0.5 + 0.5) * buffer.x;
  const py = (_snapPos.y * 0.5 + 0.5) * buffer.y;
  // The quad's left edge is px - W/2 and its bottom edge py - anchorY*H (both even, so whole
  // numbers away from px/py).
  const left = Math.round(px - widthDevice / 2);
  const bottom = Math.round(py - anchorY * heightDevice);
  sprite.center.set((px - left) / widthDevice, (py - bottom) / heightDevice);
}
