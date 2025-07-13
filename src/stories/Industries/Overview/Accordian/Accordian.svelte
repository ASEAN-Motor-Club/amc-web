<script lang="ts">
  import { slide } from "svelte/transition";
  import { type Snippet } from "svelte";
  import { INV_STATUS } from "$lib/constants";
	import { ActiveAccordian } from "./ActiveAccordianManager.svelte";
  import Card from "$lib/ui/Card/Card.svelte";

	type AccordianProps = {
		/**
		 * Name of the factory
		 */
		factoryName: string;
		/**
		 * Is the factory a manufacturing factory
		 */
		isManufacturer: boolean;
		/**
		 * State of the factory's inventory
		 */
		inventoryStatus: number;

		index: number;
		// Contents to be rendered in accordian when expanded
		children: Snippet;
	}
	
	// let children: Snippet;
	let {
		factoryName,
		isManufacturer,
		inventoryStatus,
		children,
		index,
	 }: AccordianProps = $props();

</script>

<style>

	.accordianBody {
		align-items: center;
		width: 420px;
	}

	button {
		cursor: pointer;
	}

	button.accordian {
		margin: 4px;
		width: 100%;
		display: inline;
	}

	button.details {
		margin-inline: auto;
		padding: 4px;
		border-radius: 4px;
		background-color: aquamarine;
	}

	.accordianBody.critical {
		background-color: #f2d7d5;
		border: solid brown;
		border-width: 0px 4px 4px 4px;
	}

	.accordianBody.alert {
		background-color: #fad7a0; 
		border: solid #e67e22;
		border-width: 0px 4px 4px 4px;
	}

	.accordianBody.caution {
		background-color: white;
		border: solid #f1c40f;
		border-width: 0px 4px 4px 4px;
	}

	.accordianBody.normal {
		background-color: white;
		border: solid green;
		border-width: 0px 4px 4px 4px;
	}

	.panel.critical {
		background-color: brown;
	}

	.panel.alert {
		background-color: #e67e22;
	}

	.panel.caution {
		background-color: #f1c40f;
	}

	.panel.normal {
		background-color: green;
	}

	.extend {
		transition-duration: 200ms;
		transition-timing-function: ease-out;
		transform: rotate(180deg);
	}

	.button.critical {
		background-color: brown;
	}

	.button.alert {
		background-color: #e67e22;
	}

	.button.caution {
		background-color: #f1c40f;
	}

	.button.normal {
		background-color: green;
	}

	svg {
		width: 40px;
		height: 40px;
		transition-duration: 200ms;
		transition-timing-function: ease-out;
		transform: rotate(360deg);
	}

	svg.alert {
		width: 36px;
		height: 36px;
	}
</style>

<div class="relative !p-0 h-[46px] w-[420px]">
<Card class={
	[
		"absolute accordian h-full !p-0",
		{"absolute border-red-700 border-4 border-t-0": inventoryStatus === INV_STATUS.ALERT && isManufacturer},
		{"border-orange-500 border-4 border-t-0": inventoryStatus === INV_STATUS.ALERT && isManufacturer},
		{"border-yellow border-4 border-t-0": inventoryStatus === INV_STATUS.CAUTION && isManufacturer},
		{"border-green-600 border-t-0": inventoryStatus == INV_STATUS.NORMAL && isManufacturer}
	]
}>
<!-- <div class={["accordian h-full",
	{"border-red-700 border-4 border-t-0": inventoryStatus === INV_STATUS.ALERT}]}
		class:alert={inventoryStatus === INV_STATUS.ALERT && isManufacturer}
		class:caution={inventoryStatus === INV_STATUS.CAUTION && isManufacturer}
		class:normal={inventoryStatus == INV_STATUS.NORMAL && isManufacturer}
> -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="panel flex justify-between cursor-pointer"
		class:critical={inventoryStatus === INV_STATUS.CRITICAL && isManufacturer}
		class:alert={inventoryStatus === INV_STATUS.ALERT && isManufacturer}
		class:caution={inventoryStatus === INV_STATUS.CAUTION && isManufacturer}
		class:normal={inventoryStatus == INV_STATUS.NORMAL && isManufacturer}
		onclick={() => {
			if (ActiveAccordian.atIndex === index) {
				ActiveAccordian.atIndex = -1
			} else {
				ActiveAccordian.atIndex = index	
			}
		}}
	>
		<div class="self-center w-full">
			{#if inventoryStatus > INV_STATUS.CAUTION}
				<svg fill="#e7af13" class="alert inline pl-2 animate-pulse" viewBox="0 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg" stroke="#e7af13"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <title>warning</title> <path d="M30.555 25.219l-12.519-21.436c-1.044-1.044-2.738-1.044-3.782 0l-12.52 21.436c-1.044 1.043-1.044 2.736 0 3.781h28.82c1.046-1.045 1.046-2.738 0.001-3.781zM14.992 11.478c0-0.829 0.672-1.5 1.5-1.5s1.5 0.671 1.5 1.5v7c0 0.828-0.672 1.5-1.5 1.5s-1.5-0.672-1.5-1.5v-7zM16.501 24.986c-0.828 0-1.5-0.67-1.5-1.5 0-0.828 0.672-1.5 1.5-1.5s1.5 0.672 1.5 1.5c0 0.83-0.672 1.5-1.5 1.5z"></path> </g></svg>
			{/if}
			<p class="inline p-4 pl-2 text-left text-white text-xl font-extrabold">
				{factoryName}
			</p>
		</div>
		<!-- Credit: https://www.svgrepo.com/svg/521469/arrow-down -->
		<svg class:extend={ActiveAccordian.atIndex === index} class="justify-self-end self-center" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M5.70711 9.71069C5.31658 10.1012 5.31658 10.7344 5.70711 11.1249L10.5993 16.0123C11.3805 16.7927 12.6463 16.7924 13.4271 16.0117L18.3174 11.1213C18.708 10.7308 18.708 10.0976 18.3174 9.70708C17.9269 9.31655 17.2937 9.31655 16.9032 9.70708L12.7176 13.8927C12.3271 14.2833 11.6939 14.2832 11.3034 13.8927L7.12132 9.71069C6.7308 9.32016 6.09763 9.32016 5.70711 9.71069Z" fill="#ffffff"></path></g></svg>
	</div>
	{#if ActiveAccordian.atIndex === index}
		<div class="accordianBody pt-2 px-2 w-full z-9999"
			class:critical={inventoryStatus === INV_STATUS.CRITICAL}
			class:alert={inventoryStatus === INV_STATUS.ALERT}
			class:caution={inventoryStatus === INV_STATUS.CAUTION}
			class:normal={inventoryStatus === INV_STATUS.NORMAL}
			transition:slide={{duration: 200}}
		>
			{@render children()}
		</div>
	{/if}
<!-- </div> -->
</Card>
</div>