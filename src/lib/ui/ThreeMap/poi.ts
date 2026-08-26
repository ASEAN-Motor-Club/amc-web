import * as THREE from 'three';
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
  /** Dot diameter in screen px. */
  size: number;
  /** Dot outline thickness in texture px (defaults to DOT_STROKE_PX). */
  strokeWidth?: number;
}

const DOT_TEXTURE_SIZE = 128;
const DOT_RADIUS_PX = 52; // ~40% of canvas so the ring fits
const DOT_STROKE_PX = 10;

/** Palette signature - identical palettes share one texture (and one instanced sprite). */
export function dotPaletteKey(palette: DotPalette): string {
  return `${palette.fill}|${palette.stroke}|${palette.strokeWidth ?? DOT_STROKE_PX}`;
}

const dotTextureCache = new Map<string, THREE.CanvasTexture>();

/**
 * One dot texture per distinct palette, shared by every marker using it. Each instanced
 * sprite renders a single texture, so the dot always samples its own cell - no per-instance
 * UV, which is what keeps instancing reliable across marker types.
 */
export function makeDotTexture(palette: DotPalette): THREE.CanvasTexture {
  const key = dotPaletteKey(palette);
  const cached = dotTextureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = DOT_TEXTURE_SIZE;
  canvas.height = DOT_TEXTURE_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context for dot');
  const cx = DOT_TEXTURE_SIZE / 2;
  const cy = DOT_TEXTURE_SIZE / 2;
  ctx.beginPath();
  ctx.arc(cx, cy, DOT_RADIUS_PX, 0, Math.PI * 2);
  ctx.fillStyle = makeColor(palette.fill).getStyle();
  ctx.fill();
  ctx.lineWidth = palette.strokeWidth ?? DOT_STROKE_PX;
  ctx.strokeStyle = makeColor(palette.stroke).getStyle();
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  dotTextureCache.set(key, texture);
  return texture;
}

const TEXTURE_W = 512;
const TEXTURE_H = 128;
/** Text occupies this fraction of the sprite texture height (baseline-middle at center). */
const TEXT_HEIGHT_FRACTION = 40 / TEXTURE_H;

/** A text sprite always facing the camera, kept at a constant screen size. */
export function makeTextSprite(text: string, style: LabelStyle): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_W;
  canvas.height = TEXTURE_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context for text');
  ctx.font = style.font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.measureText(text);
  const cx = TEXTURE_W / 2;
  const cy = TEXTURE_H / 2;
  if (style.strokeWidth > 0) {
    ctx.strokeStyle = style.strokeStyle;
    ctx.lineWidth = style.strokeWidth;
    ctx.lineJoin = 'round';
    ctx.strokeText(text, cx, cy);
  }
  ctx.fillStyle = style.fillStyle;
  ctx.fillText(text, cx, cy);

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
  // World units map 1:1 to screen pixels with sizeAttenuation: false. Scale so the
  // text (which fills TEXT_HEIGHT_FRACTION of the texture) renders style.sizePx tall.
  // Anchor bottom-center so the caller positions the label above the dot.
  sprite.scale.set(style.sizePx / TEXT_HEIGHT_FRACTION, style.sizePx, 1);
  return sprite;
}

export interface LabelStyle {
  font: string;
  fillStyle: string;
  strokeStyle: string;
  strokeWidth: number;
  /** On-screen text height in px. */
  sizePx: number;
}
