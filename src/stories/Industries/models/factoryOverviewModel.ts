import type { InventoryDataModel } from "./inventoryDataModel";

export interface FactoryDataOverviewModel {
	/**
	 * In-game factory's GUID
	 * Used for fetching API for factory's detail
	 */
	guid: string;
	/**
	 * Factory's name
	 */
	factoryName: string;
	/**
	 * The factory is either manufacturing or producer
	 */
	isManufacturer: boolean;
	/**
	 * Factory's inventory
	 */
	inventory: InventoryDataModel;

	isOpenModal?: boolean;
}
