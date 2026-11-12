import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { pxPerWorldUnit, snapLabelToPixelGrid, type TextSprite } from './poi.ts';

function label(width: number, height: number, anchorY = 0): TextSprite {
  return {
    sprite: new THREE.Sprite(),
    text: '',
    style: {} as TextSprite['style'],
    widthDevice: width,
    heightDevice: height,
    anchorY,
  };
}

/** Where the quad's bottom-left corner lands, in device px (y up), from the sprite's own state. */
function quadCorner(
  { sprite, widthDevice, heightDevice }: TextSprite,
  camera: THREE.Camera,
  buffer: THREE.Vector2,
): [left: number, bottom: number] {
  const ndc = sprite.position.clone().project(camera);
  const px = (ndc.x * 0.5 + 0.5) * buffer.x;
  const py = (ndc.y * 0.5 + 0.5) * buffer.y;
  return [px - sprite.center.x * widthDevice, py - sprite.center.y * heightDevice];
}

function perspective(): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(55, 1000 / 700, 5, 100000);
  camera.position.set(120, 3000, -80);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  return camera;
}

function orthographic(): THREE.OrthographicCamera {
  const camera = new THREE.OrthographicCamera(-500, 500, 350, -350, 1, 100000);
  camera.position.set(33.3, 3000, 71.7);
  camera.lookAt(33.3, 0, 71.7);
  camera.updateMatrixWorld();
  return camera;
}

describe('snapLabelToPixelGrid', () => {
  // Odd and fractional-DPR buffer sizes are the ones where a naive centred quad lands between pixels.
  const buffers = [
    new THREE.Vector2(1000, 700),
    new THREE.Vector2(1251, 875),
    new THREE.Vector2(1501, 1051),
  ];

  it.each([
    ['perspective', perspective],
    ['orthographic', orthographic],
  ])('puts the quad corners on whole device pixels (%s camera)', (_name, makeCamera) => {
    const camera = makeCamera();
    for (const buffer of buffers) {
      for (const [x, z] of [
        [0, 0],
        [12.34, -56.78],
        [-90.1, 33.3],
      ]) {
        // Bottom-anchored labels (0) and centred ones (0.5, even height).
        for (const anchorY of [0, 0.5]) {
          const item = label(86, 32, anchorY);
          item.sprite.position.set(x, 25, z);
          snapLabelToPixelGrid(item, camera, buffer);
          const [left, bottom] = quadCorner(item, camera, buffer);
          expect(left).toBeCloseTo(Math.round(left), 4);
          expect(bottom).toBeCloseTo(Math.round(bottom), 4);
        }
      }
    }
  });

  it('moves the quad by under one pixel and keeps the anchor in place', () => {
    const camera = perspective();
    const buffer = buffers[1];
    const item = label(60, 30);
    item.sprite.position.set(7.7, 0, 3.1);
    const before = item.sprite.position.clone();
    snapLabelToPixelGrid(item, camera, buffer);
    expect(item.sprite.position).toEqual(before);
    // Unsnapped, the quad is centred on the anchor: corner = anchor - (W/2, 0).
    const ndc = before.clone().project(camera);
    const naiveLeft = (ndc.x * 0.5 + 0.5) * buffer.x - 30;
    const naiveBottom = (ndc.y * 0.5 + 0.5) * buffer.y;
    const [left, bottom] = quadCorner(item, camera, buffer);
    expect(Math.abs(left - naiveLeft)).toBeLessThanOrEqual(0.5 + 1e-6);
    expect(Math.abs(bottom - naiveBottom)).toBeLessThanOrEqual(0.5 + 1e-6);
  });

  it('leaves labels behind the camera alone', () => {
    const camera = perspective();
    const item = label(40, 20);
    item.sprite.position.set(0, 6000, 0); // above the camera, looking down
    const before = item.sprite.center.clone();
    snapLabelToPixelGrid(item, camera, buffers[0]);
    expect(item.sprite.center).toEqual(before);
  });
});

describe('label size under both cameras', () => {
  it('keeps one canvas texel on one device pixel: scale * pxPerWorld = canvas size', () => {
    for (const camera of [perspective(), orthographic()]) {
      const buffer = new THREE.Vector2(1251, 875);
      const item = label(86, 31);
      item.sprite.position.set(5, 10, -5);
      snapLabelToPixelGrid(item, camera, buffer);
      const pxPerWorld = pxPerWorldUnit(camera, buffer.y);
      expect(item.sprite.scale.x * pxPerWorld).toBeCloseTo(86);
      expect(item.sprite.scale.y * pxPerWorld).toBeCloseTo(31);
    }
  });

  it('follows an orthographic zoom, where world units per pixel change', () => {
    const camera = orthographic();
    const buffer = new THREE.Vector2(1000, 700);
    const item = label(60, 20);
    item.sprite.position.set(0, 0, 0);
    snapLabelToPixelGrid(item, camera, buffer);
    const before = item.sprite.scale.x;
    camera.zoom = 4;
    camera.updateProjectionMatrix();
    snapLabelToPixelGrid(item, camera, buffer);
    expect(item.sprite.scale.x).toBeCloseTo(before / 4);
  });
});
