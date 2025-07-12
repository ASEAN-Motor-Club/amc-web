export interface InputDataModel {
	/**
	 * Input's name
	 */
	name: string;
	/**
	 * Maximum of an input inventory that the factory can store
	 * -1 means infinity
	 */
	maxInv: number;
	/**
	 * Amount of an input required to produce an output
	 */
	invRequire: number;
	/**
	 * An input's current inventory
	 */
	currInv: number;
}