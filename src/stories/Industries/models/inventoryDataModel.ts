import type { InputDataModel } from "./inputDataModel";
import type { OutputDataModel } from "./outputDataModel";

export interface InventoryDataModel {
	/**
	 * Factory's input inventory
	 */
	inputs: InputDataModel[];
	/**
	 * Factory's output inventory
	 */
	outputs: OutputDataModel[];
	/**
	 * Factory's inventory status
	 * - 0: normal
	 * - 1: caution
	 * - 2: alert
	 * - 3: critical
	 */
	status: number;
}