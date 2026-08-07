import { describe, expect, it } from 'vitest';
import { getDeliveryLine, type DeliveryLink } from './deliveryLine';
import { deliveryPointsMap } from '$lib/data/deliveryPoint';

/** Sangdo Lumbermill, whose drop point takes its logs but not its fuel. */
const LUMBERMILL = '2b33867446cf343cad06f388f68922af';
/** The lumbermill's drop point. */
const LOG_DROP = 'f6ba0c254c1d2258122fc984769f43f9';
/** Iseungag, supplies logs and nothing else. */
const LOG_SUPPLIER = '4d39d4e14d96da47d4e26d9f9fe7d0ff';
/** Noksan Fuel Storage, supplies fuel and nothing else. */
const FUEL_SUPPLIER = 'c9d73fbb47b439d6164ac3bc614c79fa';
/** Copper Refinery, a second parent/drop pair to check the link orientation against. */
const REFINERY = '9c9adfca4346c68e7b5f83ae60c21b93';
const REFINERY_DROP = '364f83784b99394690b7259d8834d4bc';
/** Seongsan Concrete Factory, whose sand drop demands the `_TSand` aggregate rather than keys. */
const CONCRETE_FACTORY = 'a24215bf42a1c9cefc2f85900084a6d6';
const SAND_DUMP = '40d0f8e9487a886b65ec228b03c149f0';
/** Jeju Construction Site, supplies both sand keys the aggregate covers. */
const SAND_SUPPLIER = '2eafa31e453a67316dfb1c859bce3be0';

const getPoint = (guid: string) => {
  const point = deliveryPointsMap.get(guid);
  if (!point) {
    throw new Error(`Missing fixture point: ${guid}`);
  }
  return point;
};

const guidPairs = (links: DeliveryLink[]) => links.map(([from, to]) => [from.guid, to.guid]);

const lineFor = (guid: string, jobOnly = false) => {
  const line = getDeliveryLine(getPoint(guid), [], jobOnly);
  if (!line) {
    throw new Error(`No lines built for ${guid}`);
  }
  return line;
};

describe('getDeliveryLine', () => {
  describe('drop point links', () => {
    it('runs from the drop point to its parent when the parent is selected', () => {
      expect(guidPairs(lineFor(LUMBERMILL).dropPoint)).toContainEqual([LOG_DROP, LUMBERMILL]);
      expect(guidPairs(lineFor(REFINERY).dropPoint)).toContainEqual([REFINERY_DROP, REFINERY]);
    });

    it('keeps that direction when the drop point itself is selected', () => {
      expect(guidPairs(lineFor(LOG_DROP).dropPoint)).toContainEqual([LOG_DROP, LUMBERMILL]);
      expect(guidPairs(lineFor(REFINERY_DROP).dropPoint)).toContainEqual([REFINERY_DROP, REFINERY]);
    });

    it('orients every emitted link from a drop point to its own parent', () => {
      for (const guid of [LUMBERMILL, LOG_DROP, REFINERY, REFINERY_DROP, LOG_SUPPLIER]) {
        const misoriented = guidPairs(lineFor(guid).dropPoint).filter(
          ([from, to]) => getPoint(from).parent !== to,
        );
        expect(misoriented).toEqual([]);
      }
    });
  });

  describe('demand lines', () => {
    it('leaves out cargo a drop point takes, because the drop point receives it', () => {
      expect(lineFor(LUMBERMILL).demand.map((d) => d.guid)).not.toContain(LOG_SUPPLIER);
    });

    it('keeps cargo that no drop point takes', () => {
      expect(lineFor(LUMBERMILL).demand.map((d) => d.guid)).toContain(FUEL_SUPPLIER);
    });

    it('draws the left-out traffic on the drop point instead', () => {
      expect(lineFor(LOG_DROP).demand.map((d) => d.guid)).toContain(LOG_SUPPLIER);
    });

    it('leaves out cargo a drop point takes as an aggregate type', () => {
      expect(lineFor(CONCRETE_FACTORY).demand.map((d) => d.guid)).not.toContain(SAND_SUPPLIER);
      expect(lineFor(SAND_DUMP).demand.map((d) => d.guid)).toContain(SAND_SUPPLIER);
    });
  });

  describe('supply lines', () => {
    it('targets the drop point rather than the parent that hides behind it', () => {
      const destinations = lineFor(LOG_SUPPLIER).supply.map((d) => d.guid);
      expect(destinations).toContain(LOG_DROP);
      expect(destinations).not.toContain(LUMBERMILL);
    });

    it('still targets a parent for cargo none of its drop points take', () => {
      expect(lineFor(FUEL_SUPPLIER).supply.map((d) => d.guid)).toContain(LUMBERMILL);
    });
  });

  describe('job filter', () => {
    it('drops a point entirely when no job touches it', () => {
      expect(getDeliveryLine(getPoint(LUMBERMILL), [], true)).toBeUndefined();
    });

    it('builds the full line set when the filter is off', () => {
      const line = lineFor(LUMBERMILL);
      expect(line.point).toEqual({
        x: getPoint(LUMBERMILL).coord.x,
        y: getPoint(LUMBERMILL).coord.y,
      });
      expect(line.supply.length + line.demand.length).toBeGreaterThan(0);
    });
  });

  it('never draws the same demand line twice', () => {
    const guids = lineFor(LUMBERMILL).demand.map((d) => d.guid);
    expect(new Set(guids).size).toBe(guids.length);
  });
});
