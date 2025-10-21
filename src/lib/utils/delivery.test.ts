import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the cargo key data before importing the module
vi.mock('$lib/assets/data/out_cargo_key.json', () => ({
  default: {
    _TSmallPackage: ['SmallBox', 'CheeseBox', 'MeatBox', 'BreadBox'],
    _TLargePackage: ['BoxPallete_01', 'Container_20ft_01'],
    _TContainer: ['Container_20ft_01', 'Container_40ft_01'],
  },
}));

import { isCargoType, flattenCargoType, getMatchJobFn, getInventoryAmount } from './delivery';
import type { DeliveryJob, DeliveryPointInfo, InputInventoryElement } from '$lib/api/types';
import type { DeliveryPoint } from '$lib/data/deliveryPoint';
import type { DeliveryCargo, DeliveryCargoKey, DeliveryCargoType } from '$lib/data/types';

describe('delivery utilities', () => {
  describe('isCargoType', () => {
    it('should return true for cargo types (starting with _T)', () => {
      expect(isCargoType('_TSmallPackage' as DeliveryCargo)).toBe(true);
      expect(isCargoType('_TLargePackage' as DeliveryCargo)).toBe(true);
      expect(isCargoType('_TContainer' as DeliveryCargo)).toBe(true);
    });

    it('should return false for regular cargo keys', () => {
      expect(isCargoType('SmallBox' as DeliveryCargo)).toBe(false);
      expect(isCargoType('CheeseBox' as DeliveryCargo)).toBe(false);
      expect(isCargoType('Container_20ft_01' as DeliveryCargo)).toBe(false);
      expect(isCargoType('Coal' as DeliveryCargo)).toBe(false);
    });
  });

  describe('flattenCargoType', () => {
    it('should return array of cargo keys for cargo types', () => {
      expect(flattenCargoType('_TSmallPackage' as DeliveryCargoType)).toEqual([
        'SmallBox',
        'CheeseBox',
        'MeatBox',
        'BreadBox',
      ]);
      expect(flattenCargoType('_TLargePackage' as DeliveryCargoType)).toEqual([
        'BoxPallete_01',
        'Container_20ft_01',
      ]);
      expect(flattenCargoType('_TContainer' as DeliveryCargoType)).toEqual([
        'Container_20ft_01',
        'Container_40ft_01',
      ]);
    });

    it('should return single-item array for regular cargo keys', () => {
      expect(flattenCargoType('SmallBox' as DeliveryCargoKey)).toEqual(['SmallBox']);
      expect(flattenCargoType('CheeseBox' as DeliveryCargoKey)).toEqual(['CheeseBox']);
      expect(flattenCargoType('Container_20ft_01' as DeliveryCargoKey)).toEqual([
        'Container_20ft_01',
      ]);
    });
  });

  describe('getMatchJobFn', () => {
    let mockDeliveryPoint: DeliveryPoint;
    let mockJob: DeliveryJob;

    beforeEach(() => {
      mockDeliveryPoint = {
        type: 'Warehouse_C',
        name: { en: 'Test Warehouse' },
        coord: { x: 0, y: 0, z: 0 },
        guid: 'test-guid-123',
        demandStorage: {} as Record<DeliveryCargo, number>,
        supplyStorage: {} as Record<DeliveryCargo, number>,
        allSupply: [],
        allDemand: [],
        allSupplyKey: ['SmallBox', 'CheeseBox', 'Container_20ft_01'],
        allDemandKey: [],
      } as DeliveryPoint;

      mockJob = {
        id: 1,
        name: 'Test Job',
        cargos: [{ key: 'SmallBox' as DeliveryCargo, label: 'Small Box' }],
        source_points: [],
        destination_points: [],
        deliveries: [],
        quantity_requested: 10,
        quantity_fulfilled: 0,
        requested_at: '2024-01-01T00:00:00Z',
        fulfilled_at: '',
        expired_at: '2024-12-31T23:59:59Z',
        bonus_multiplier: 1.0,
        completion_bonus: 1000,
        description: 'Test delivery job',
        fulfilled: false,
      };
    });

    it('should match jobs with cargo that delivery point supplies', () => {
      const matchFn = getMatchJobFn(mockDeliveryPoint);
      expect(matchFn(mockJob)).toBe(true);
    });

    it('should not match jobs with cargo that delivery point does not supply', () => {
      mockJob.cargos = [{ key: 'Coal' as DeliveryCargo, label: 'Coal' }];
      const matchFn = getMatchJobFn(mockDeliveryPoint);
      expect(matchFn(mockJob)).toBe(false);
    });

    it('should match jobs with cargo types that expand to supported keys', () => {
      mockJob.cargos = [{ key: '_TSmallPackage' as DeliveryCargo, label: 'Small Package' }];
      const matchFn = getMatchJobFn(mockDeliveryPoint);
      expect(matchFn(mockJob)).toBe(true);
    });

    it('should match when source points is empty (global job)', () => {
      mockJob.source_points = [];
      const matchFn = getMatchJobFn(mockDeliveryPoint);
      expect(matchFn(mockJob)).toBe(true);
    });

    it('should match when delivery point is in source points', () => {
      mockJob.source_points = [
        {
          coord: { x: 0, y: 0, z: 0 },
          guid: 'test-guid-123',
          name: 'Test Point',
          type: 'Warehouse_C',
          data: {
            deliveries: [],
            inputInventory: [],
            outputInventory: [],
          },
          last_updated: '2024-01-01T00:00:00Z',
        },
      ];
      const matchFn = getMatchJobFn(mockDeliveryPoint);
      expect(matchFn(mockJob)).toBe(true);
    });

    it('should not match when delivery point is not in source points', () => {
      mockJob.source_points = [
        {
          coord: { x: 0, y: 0, z: 0 },
          guid: 'different-guid',
          name: 'Different Point',
          type: 'Warehouse_C',
          data: {
            deliveries: [],
            inputInventory: [],
            outputInventory: [],
          },
          last_updated: '2024-01-01T00:00:00Z',
        },
      ];
      const matchFn = getMatchJobFn(mockDeliveryPoint);
      expect(matchFn(mockJob)).toBe(false);
    });

    it('should handle multiple cargos - match if any is supported', () => {
      mockJob.cargos = [
        { key: 'Coal' as DeliveryCargo, label: 'Coal' }, // Not supported
        { key: 'SmallBox' as DeliveryCargo, label: 'Small Box' }, // Supported
      ];
      const matchFn = getMatchJobFn(mockDeliveryPoint);
      expect(matchFn(mockJob)).toBe(true);
    });

    it('should not match when no cargos are supported', () => {
      mockJob.cargos = [
        { key: 'Coal' as DeliveryCargo, label: 'Coal' },
        { key: 'Oil' as DeliveryCargo, label: 'Oil' },
      ];
      const matchFn = getMatchJobFn(mockDeliveryPoint);
      expect(matchFn(mockJob)).toBe(false);
    });
  });

  describe('getInventoryAmount', () => {
    let mockDeliveryPointInfo: DeliveryPointInfo;

    beforeEach(() => {
      mockDeliveryPointInfo = {
        coord: { x: 0, y: 0, z: 0 },
        guid: 'test-guid',
        name: 'Test Point',
        type: 'Warehouse_C',
        data: {
          deliveries: [],
          inputInventory: [
            { cargoKey: 'SmallBox', amount: 10 },
            { cargoKey: 'CheeseBox', amount: 5 },
            { cargoKey: 'MeatBox', amount: 8 },
            { cargoKey: 'Container_20ft_01', amount: 3 },
          ] as InputInventoryElement[],
          outputInventory: [
            { cargoKey: 'SmallBox', amount: 15 },
            { cargoKey: 'CheeseBox', amount: 12 },
            { cargoKey: 'BreadBox', amount: 7 },
            { cargoKey: 'Container_40ft_01', amount: 2 },
          ] as InputInventoryElement[],
        },
        last_updated: '2024-01-01T00:00:00Z',
      };
    });

    it('should return 0 when deliveryPointInfo is undefined', () => {
      expect(getInventoryAmount(undefined, 'SmallBox' as DeliveryCargo, true)).toBe(0);
      expect(getInventoryAmount(undefined, 'SmallBox' as DeliveryCargo, false)).toBe(0);
    });

    it('should get input inventory amount for regular cargo keys', () => {
      expect(getInventoryAmount(mockDeliveryPointInfo, 'SmallBox' as DeliveryCargo, true)).toBe(10);
      expect(getInventoryAmount(mockDeliveryPointInfo, 'CheeseBox' as DeliveryCargo, true)).toBe(5);
      expect(getInventoryAmount(mockDeliveryPointInfo, 'MeatBox' as DeliveryCargo, true)).toBe(8);
    });

    it('should get output inventory amount for regular cargo keys', () => {
      expect(getInventoryAmount(mockDeliveryPointInfo, 'SmallBox' as DeliveryCargo, false)).toBe(
        15,
      );
      expect(getInventoryAmount(mockDeliveryPointInfo, 'CheeseBox' as DeliveryCargo, false)).toBe(
        12,
      );
      expect(getInventoryAmount(mockDeliveryPointInfo, 'BreadBox' as DeliveryCargo, false)).toBe(7);
    });

    it('should return 0 for non-existent cargo keys', () => {
      expect(getInventoryAmount(mockDeliveryPointInfo, 'Coal' as DeliveryCargo, true)).toBe(0);
      expect(getInventoryAmount(mockDeliveryPointInfo, 'Oil' as DeliveryCargo, false)).toBe(0);
    });

    it('should sum amounts for cargo types in input inventory', () => {
      // _TSmallPackage includes SmallBox, CheeseBox, MeatBox, BreadBox
      // In input inventory: SmallBox(10) + CheeseBox(5) + MeatBox(8) + BreadBox(0) = 23
      expect(
        getInventoryAmount(mockDeliveryPointInfo, '_TSmallPackage' as DeliveryCargo, true),
      ).toBe(23);
    });

    it('should sum amounts for cargo types in output inventory', () => {
      // _TSmallPackage includes SmallBox, CheeseBox, MeatBox, BreadBox
      // In output inventory: SmallBox(15) + CheeseBox(12) + MeatBox(0) + BreadBox(7) = 34
      expect(
        getInventoryAmount(mockDeliveryPointInfo, '_TSmallPackage' as DeliveryCargo, false),
      ).toBe(34);
    });

    it('should handle cargo types with partial matches', () => {
      // _TContainer includes Container_20ft_01, Container_40ft_01
      // In input inventory: Container_20ft_01(3) + Container_40ft_01(0) = 3
      expect(getInventoryAmount(mockDeliveryPointInfo, '_TContainer' as DeliveryCargo, true)).toBe(
        3,
      );
      // In output inventory: Container_20ft_01(0) + Container_40ft_01(2) = 2
      expect(getInventoryAmount(mockDeliveryPointInfo, '_TContainer' as DeliveryCargo, false)).toBe(
        2,
      );
    });

    it('should return 0 for cargo types with no matching items', () => {
      // _TLargePackage includes BoxPallete_01, Container_20ft_01
      // BoxPallete_01 is not in inventory, Container_20ft_01(3) in input, (0) in output
      expect(
        getInventoryAmount(mockDeliveryPointInfo, '_TLargePackage' as DeliveryCargo, true),
      ).toBe(3);
      expect(
        getInventoryAmount(mockDeliveryPointInfo, '_TLargePackage' as DeliveryCargo, false),
      ).toBe(0);
    });

    it('should handle invalid inventory data gracefully', () => {
      const invalidInfo = {
        ...mockDeliveryPointInfo,
        data: {
          ...mockDeliveryPointInfo.data,
          inputInventory: null as unknown as InputInventoryElement[],
          outputInventory: 'invalid' as unknown as InputInventoryElement[],
        },
      };

      expect(getInventoryAmount(invalidInfo, 'SmallBox' as DeliveryCargo, true)).toBe(0);
      expect(getInventoryAmount(invalidInfo, 'SmallBox' as DeliveryCargo, false)).toBe(0);
    });

    it('should handle empty inventory arrays', () => {
      const emptyInfo = {
        ...mockDeliveryPointInfo,
        data: {
          ...mockDeliveryPointInfo.data,
          inputInventory: [],
          outputInventory: [],
        },
      };

      expect(getInventoryAmount(emptyInfo, 'SmallBox' as DeliveryCargo, true)).toBe(0);
      expect(getInventoryAmount(emptyInfo, '_TSmallPackage' as DeliveryCargo, false)).toBe(0);
    });
  });
});
