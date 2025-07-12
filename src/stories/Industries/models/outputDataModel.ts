export interface OutputDataModel {
	name: string;
	/**
	 * Maximum input inventory that the factory can hold
	 */
	maxInv: number;
	/**
	 * Amount that the factory produces
	 */
	invProduce: number;
	/**
	 * An output's current inventory
	 */
	currInv: number;
}