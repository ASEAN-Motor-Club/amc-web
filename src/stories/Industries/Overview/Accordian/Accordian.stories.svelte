<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { factoryData, factoryDataArr} from "../../data/accordianData";
	import Accordian from "./Accordian.svelte";
  import AccordianBody from "../AccordianBody/AccordianBody.svelte";
  import Button from "$lib/ui/Button/Button.svelte";
  import type { FactoryDataOverviewModel } from "../../models/factoryOverviewModel";
  import { onMount } from "svelte";

	const { Story } = defineMeta({
		title: "Industries",
		component: Accordian,
		tags: ['data'],
	});

	let accordianCtrlArr: boolean[] = $state(new Array(factoryDataArr.length).fill(false));

	let activeAccordianId: number[] = $state([-1]);

	let onAccordianClick = (i: number) => {
		console.log("Active!")
		// console.log("NUMBER", i)
		// activeAccordianId = i === activeAccordianId ? -1 : i
		// if (!accordianCtrlArr[i]) {
		// 	accordianCtrlArr = accordianCtrlArr.fill(false);
		// 	accordianCtrlArr[i] = !accordianCtrlArr[i];
		// } else {
		// 	accordianCtrlArr[i] = false;
		// }
	}

</script>

<style>
	Button.test {
		background-color: red;
	}
</style>

<Story name="Default">
	{#snippet template({...args})}
		<Accordian
			factoryGuid={factoryData.guid}
			isManufacturer={factoryData.isManufacturer}
			factoryName={factoryData.factoryName} inventoryStatus={factoryData.inventory.status}
			index={1}
			{...args}
		>
			<AccordianBody inventory={factoryData.inventory} childButton={bttn}>
			</AccordianBody>
			</Accordian>
	{/snippet}
</Story>

<!-- isExtended={ accordianCtrlArr[i] } -->
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
		<Button class="block mx-auto my-4 text-base font-medium bg-red">More Details</Button>
{/snippet}