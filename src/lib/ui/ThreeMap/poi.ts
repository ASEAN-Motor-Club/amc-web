import * as THREE from 'three';
import { formatHex, oklch, type Color } from 'culori';

/** Dot radius in screen pixels at distance 1 (scaled by camera distance each frame). */
export const POI_DOT_SCREEN_SCALE = 1 / 22;

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
}

const DOT_TEXTURE_SIZE = 128;
const DOT_RADIUS_PX = 52; // ~40% of canvas so the ring fits
const DOT_STROKE_PX = 10;

const dotTextureCache = new Map<string, THREE.CanvasTexture>();

/**
 * A dot sprite that always faces the camera and keeps a constant screen size
 * (the caller scales it by the camera distance each frame). One shared canvas
 * texture per palette keeps memory flat.
 */
export function makeDotSprite(palette: DotPalette): THREE.Sprite {
  const key = `${palette.fill}|${palette.stroke}`;
  let texture = dotTextureCache.get(key);
  if (!texture) {
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
    ctx.lineWidth = DOT_STROKE_PX;
    ctx.strokeStyle = makeColor(palette.stroke).getStyle();
    ctx.stroke();
    texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false;
    dotTextureCache.set(key, texture);
  }
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(DOT_TEXTURE_SIZE, DOT_TEXTURE_SIZE, 1);
  sprite.center.set(0.5, 0.5);
  // UserData: base scale so the manager can scale by distance.
  return sprite;
}

const TEXTURE_W = 512;
const TEXTURE_H = 128;

/** A text sprite always facing the camera, scaled by distance for constant screen size. */
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
  });
  const sprite = new THREE.Sprite(material);
  sprite.center.set(0.5, 1);
  // Base scale maps canvas px to world units 1:1; the manager scales by distance for constant
  // screen size. Anchor bottom-center so the text sits just above the dot.
  sprite.scale.set(TEXTURE_W, TEXTURE_H, 1);
  return sprite;
}

export interface LabelStyle {
  font: string;
  fillStyle: string;
  strokeStyle: string;
  strokeWidth: number;
}
