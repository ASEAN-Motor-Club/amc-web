import * as THREE from 'three';
import type { Renderer } from 'three/webgpu';
import { formatHex, oklch, type Color } from 'culori';

/** Converts an oklch() string to hex (three's Color cannot parse oklch), via culori. */
export const convertOklchToHex = (oklchStr: string): string => {
  try {
    return formatHex(oklch(oklchStr) as Color);
  } catch {
    return '#fff';
  }
};

/** Reads a hex or oklch color (three's Color can't parse oklch). */
export function makeColor(color: string | number): THREE.Color {
  return typeof color === 'string' && color.startsWith('oklch(')
    ? new THREE.Color(convertOklchToHex(color))
    : new THREE.Color(color);
}

export interface DotPalette {
  /** Dot fill color. */
  fill: string | number;
  /** Dot outline color. */
  stroke: string | number;
  /** Dot diameter in CSS px (OL circle radius * 2). */
  diameterPx: number;
  /** Outline thickness in CSS px; defaults to 1 (OL's single circle-stroke-width). */
  strokeWidth?: number;
}

/** Default outline thickness in CSS px - OL's circle-stroke-width when unspecified. */
export const DEFAULT_DOT_STROKE_CSS_PX = 1;
/** Device-px margin around the outer stroke edge so the AA fringe survives linear filtering. */
const DOT_AA_PAD_PX = 2;

export interface ViewportScale {
  /** Device px per CSS px on the drawing surface. */
  dpr: number;
  /** Device px covered by one world unit for a sizeAttenuation:false sprite. */
  pxPerWorld: number;
}

const _bufferSize = new THREE.Vector2();

/**
 * Sprite screen metrics for the current drawing buffer. A sizeAttenuation:false sprite's
 * NDC extent is scale/tan(fovY/2), so one world unit spans f*bufferHeight/2 device px -
 * the exact factor that divides a native-size canvas into sprite scale.
 */
export function viewportScale(camera: THREE.PerspectiveCamera, renderer: Renderer): ViewportScale {
  renderer.getDrawingBufferSize(_bufferSize);
  const f = 1 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  return {
    dpr: _bufferSize.y / Math.max(renderer.domElement.clientHeight, 1),
    pxPerWorld: Math.max((f * _bufferSize.y) / 2, 1e-6),
  };
}

/** Palette signature - identical palettes share one instanced sprite group. */
export function dotPaletteKey(palette: DotPalette): string {
  return `${palette.fill}|${palette.stroke}|${palette.strokeWidth ?? DEFAULT_DOT_STROKE_CSS_PX}`;
}

/** Outline thickness in CSS px - OL's circle-stroke-width when unspecified. */
export function dotStrokeCssPx(palette: DotPalette): number {
  return palette.strokeWidth ?? DEFAULT_DOT_STROKE_CSS_PX;
}

/** Canvas side in device px: the stroke-cleared dot at native size plus an AA margin. */
function dotCanvasSidePx(palette: DotPalette, viewport: ViewportScale): number {
  const radiusDevice = (palette.diameterPx / 2) * viewport.dpr;
  const strokeDevice = dotStrokeCssPx(palette) * viewport.dpr;
  return Math.ceil(2 * (radiusDevice + strokeDevice / 2 + DOT_AA_PAD_PX));
}

/** Sprite scaleNode value mapping the dot canvas 1:1 onto device pixels. */
export function dotSpriteScale(palette: DotPalette, viewport: ViewportScale): number {
  return dotCanvasSidePx(palette, viewport) / viewport.pxPerWorld;
}

/**
 * One dot texture per distinct palette, drawn at its native on-screen device size (plus
 * stroke and AA padding) for the given viewport - no downsampling, no shimmer. Each
 * instanced sprite renders a single texture, so the dot always samples its own cell - no
 * per-instance UV, which is what keeps instancing reliable across marker types. Remake on
 * DPR changes (with dotSpriteScale for the matching scale); an unchanged DPR keeps the
 * canvas across window resizes - only the sprite scale follows the buffer height.
 */
export function makeDotTexture(palette: DotPalette, viewport: ViewportScale): THREE.CanvasTexture {
  const side = dotCanvasSidePx(palette, viewport);
  const canvas = document.createElement('canvas');
  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context for dot');
  const cx = side / 2;
  const cy = side / 2;
  ctx.beginPath();
  ctx.arc(cx, cy, (palette.diameterPx / 2) * viewport.dpr, 0, Math.PI * 2);
  ctx.fillStyle = makeColor(palette.fill).getStyle();
  ctx.fill();
  ctx.lineWidth = dotStrokeCssPx(palette) * viewport.dpr;
  ctx.strokeStyle = makeColor(palette.stroke).getStyle();
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
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
}

export interface TextSprite {
  sprite: THREE.Sprite;
  /** The text and style the sprite was built from - remade on DPR changes. */
  text: string;
  style: LabelStyle;
  /** Canvas size in device px - rescale with viewportScale.pxPerWorld on viewport changes. */
  widthDevice: number;
  heightDevice: number;
}

/** Device-px margin around the glyph ink so the AA fringe survives linear filtering. */
const LABEL_AA_PAD_PX = 2;
/** Glyph-center height above the sprite's bottom anchor, in CSS px - matches the old
 * half-texture lift and OL's 12-14px label offsetY. */
const LABEL_LIFT_CSS_PX = 15;

/** A text sprite always facing the camera, kept at a constant screen size. Ink is measured
 * and packed at native device size, so remake it when the DPR changes. */
export function makeTextSprite(
  text: string,
  style: LabelStyle,
  viewport: ViewportScale,
): TextSprite {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context for text');
  ctx.font = `${style.weight} ${style.sizeCss * viewport.dpr}px ${style.family}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const ink = ctx.measureText(text);
  const inkW = ink.actualBoundingBoxLeft + ink.actualBoundingBoxRight;
  const inkH = ink.actualBoundingBoxAscent + ink.actualBoundingBoxDescent;
  const strokeDevice = style.strokeWidthCss * viewport.dpr;
  const pad = strokeDevice / 2 + LABEL_AA_PAD_PX;
  // Resizing the canvas resets the context - set font/alignment again before drawing.
  canvas.width = Math.ceil(inkW + pad * 2);
  canvas.height = Math.ceil(inkH / 2 + LABEL_LIFT_CSS_PX * viewport.dpr + pad);
  ctx.font = `${style.weight} ${style.sizeCss * viewport.dpr}px ${style.family}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  // Anchor the ink box: its left/top edge sits pad in from the canvas corner.
  const ax = pad + ink.actualBoundingBoxLeft;
  const ay = pad + ink.actualBoundingBoxAscent;
  if (strokeDevice > 0) {
    ctx.strokeStyle = style.strokeStyle;
    ctx.lineWidth = strokeDevice;
    ctx.strokeText(text, ax, ay);
  }
  ctx.fillStyle = style.fillStyle;
  ctx.fillText(text, ax, ay);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    // Constant screen size regardless of camera distance.
    sizeAttenuation: false,
    // Render above the dots and the terrain.
    depthTest: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.center.set(0.5, 0);
  sprite.renderOrder = 2;
  // Map the canvas 1:1 onto device pixels (sizeAttenuation:false: NDC extent = scale*f).
  sprite.scale.set(canvas.width / viewport.pxPerWorld, canvas.height / viewport.pxPerWorld, 1);
  return {
    sprite,
    text,
    style,
    widthDevice: canvas.width,
    heightDevice: canvas.height,
  };
}
