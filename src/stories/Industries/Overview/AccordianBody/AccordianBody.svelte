<script lang="ts">
  import type { Snippet } from "svelte";
  import type { InventoryDataModel } from "../../models/inventoryDataModel";

	type InventoryProp = {
		inventory: InventoryDataModel;
		childButton: Snippet;
	};

	let { inventory, childButton }: InventoryProp = $props();
	console.log(childButton)
</script>

<div class="grid grid-cols-2 gap-2">
	<h4 class="text-base font-bold">Inputs</h4>
	<!-- <div class="self-stretch h-auto bg-gray-300"></div> -->
	<h4 class="text-base text-right font-bold">Outputs</h4>
	<div class="grid grid-cols-3 justify-between border-r-gray600 border-r-2 pr-3 text-sm">
		{#each inventory.inputs as input}
			<p class="col-span-2">
				{#if input.currInv / input.maxInv < 0.2}
					<b class="font-bold text-red-800 animate-pulse">!</b>
				{/if}
				{input.name} x{input.invRequire}
			</p>
			<p class="text-sm text-right">{input.currInv}/{input.maxInv}</p>
		{/each}
	</div>
	<div class="grid grid-cols-3 justify-between h-auto text-sm">
		{#each inventory.outputs as output}
			<p class="col-span-2">{output.name} x{output.invProduce}</p>
			<p class="text-right">{output.currInv}/{output.maxInv}</p>
		{/each}
	</div>
</div>
{@render childButton()}



