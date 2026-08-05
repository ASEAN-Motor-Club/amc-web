import { describe, expect, it } from 'vitest';
import { mergeTeleportPoints } from './teleport';

describe('mergeTeleportPoints', () => {
  it('returns nothing for no teleports', () => {
    expect(mergeTeleportPoints([])).toEqual([]);
  });

  it('ignores repeated names at the same coordinate', () => {
    const points = mergeTeleportPoints([
      { name: 'harbor', x: 1, y: 2, z: 3 },
      { name: 'harbor', x: 1, y: 2, z: 3 },
      { name: 'port', x: 1, y: 2, z: 3 },
      { name: 'port', x: 1, y: 2, z: 3 },
    ]);

    expect(points).toEqual([{ name: 'harbor', aliases: ['port'], coord: { x: 1, y: 2, z: 3 } }]);
  });

  it('keeps points with distinct coordinates separate and without aliases', () => {
    const points = mergeTeleportPoints([
      { name: 'harbor', x: 1, y: 2, z: 3 },
      { name: 'aewol', x: 1, y: 2, z: 4 },
    ]);

    expect(points).toEqual([
      { name: 'harbor', coord: { x: 1, y: 2, z: 3 } },
      { name: 'aewol', coord: { x: 1, y: 2, z: 4 } },
    ]);
  });

  it('merges same-coordinate points, longest name is main and the rest are aliases', () => {
    const points = mergeTeleportPoints([
      { name: 'harbor', x: 1, y: 2, z: 3 },
      { name: 'port', x: 1, y: 2, z: 3 },
      { name: 'docks', x: 1, y: 2, z: 3 },
    ]);

    expect(points).toEqual([
      { name: 'harbor', aliases: ['port', 'docks'], coord: { x: 1, y: 2, z: 3 } },
    ]);
  });

  it('merges each coordinate independently and keeps first-seen group order', () => {
    const points = mergeTeleportPoints([
      { name: 'harbor', x: 1, y: 2, z: 3 },
      { name: 'aewol', x: 4, y: 5, z: 6 },
      { name: 'port', x: 1, y: 2, z: 3 },
      { name: 'hallim', x: 4, y: 5, z: 6 },
    ]);

    expect(points).toEqual([
      { name: 'harbor', aliases: ['port'], coord: { x: 1, y: 2, z: 3 } },
      { name: 'hallim', aliases: ['aewol'], coord: { x: 4, y: 5, z: 6 } },
    ]);
  });

  it('promotes a later longer name to main and demotes the previous one to alias', () => {
    const points = mergeTeleportPoints([
      { name: 'tp', x: 1, y: 2, z: 3 },
      { name: 'harbor', x: 1, y: 2, z: 3 },
      { name: 'port', x: 1, y: 2, z: 3 },
    ]);

    expect(points).toEqual([
      { name: 'harbor', aliases: ['tp', 'port'], coord: { x: 1, y: 2, z: 3 } },
    ]);
  });

  it('keeps the earlier name as main when lengths tie', () => {
    const points = mergeTeleportPoints([
      { name: 'port', x: 1, y: 2, z: 3 },
      { name: 'dock', x: 1, y: 2, z: 3 },
    ]);

    expect(points).toEqual([{ name: 'port', aliases: ['dock'], coord: { x: 1, y: 2, z: 3 } }]);
  });
});
