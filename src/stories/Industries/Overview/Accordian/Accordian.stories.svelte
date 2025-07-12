<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { factoryData, factoryDataArr} from "../../data/accordianData";
	import Accordian from "./Accordian.svelte";
  import AccordianBody from "../AccordianBody/AccordianBody.svelte";
  import Button from "$lib/ui/Button/Button.svelte";
  import type { FactoryDataOverviewModel } from "../../models/factoryOverviewModel";

	const { Story } = defineMeta({
		title: "Industries",
		component: Accordian,
		tags: ['data'],
	});

	// let accordianCtrlArr: boolean[] = new Array(factoryDataArr.length).fill(false)

	let activeAccordianId: number = $state(-1);

	let onAccordianClick = (i: number) => {
		console.log("NUMBER", i)
		activeAccordianId = i === activeAccordianId ? -1 : i
		// if (!accordianCtrlArr[i]) {
		// 	accordianCtrlArr = accordianCtrlArr.fill(false);
		// 	accordianCtrlArr[i] = !accordianCtrlArr[i];
		// } else {
		// 	accordianCtrlArr[i] = false;
		// }
	}
</script>

<style>
</style>

<Story name="Default">
	{#snippet template({...args})}
		<Accordian
			factoryGuid={factoryData.guid}
			isManufacturer={factoryData.isManufacturer}
			factoryName={factoryData.factoryName} inventoryStatus={factoryData.inventory.status}
			{...args}
		>
			<AccordianBody inventory={factoryData.inventory} childButton={bttn}>
			</AccordianBody>
			</Accordian>
	{/snippet}
</Story>

<Story name="List">
	{#snippet template({...args})}
		<div class="mx-8 flex flex-wrap gap-x-8 gap-y-12 columns-4 justify-items-center">
			{#each factoryDataArr as data, i}
			<div>
				<Accordian
					factoryGuid={data.guid}
					isManufacturer={data.isManufacturer}
					factoryName={data.factoryName} inventoryStatus={data.inventory.status}
					index={i}
					isExtended={i === activeAccordianId}

					{...args}
				>
					<AccordianBody inventory={data.inventory} childButton={bttn}>
					</AccordianBody>
				</Accordian>
			</div>
			{/each}
		</div>
	{/snippet}
</Story>

{#snippet bttn()}
		<Button class="block mx-auto my-4 text-base font-medium">More Details</Button>
{/snippet}