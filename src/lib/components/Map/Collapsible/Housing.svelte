<script lang="ts">
  import { getHousingData } from '$lib/api/housing';
  import type { HouseData } from '$lib/api/types';
  import HouseCard from '$lib/components/Housing/HouseCard.svelte';
  import { onMount } from 'svelte';
  import { houses } from '$lib/data/house';
  import TextInput from '$lib/ui/TextInput/TextInput.svelte';
  import type { FormEventHandler } from 'svelte/elements';
  import Select from '$lib/ui/Select/Select.svelte';
  import SelectOption from '$lib/ui/Select/SelectOption.svelte';
  import CommonHead from '$lib/components/CommonHead/CommonHead.svelte';
  import { m as msg } from '$lib/paraglide/messages';
  import { getMsgModalContext } from '$lib/components/MsgModal/context';
  import { SvelteURLSearchParams } from 'svelte/reactivity';
  import { goto } from '$app/navigation';
  import { clientSearchParams, clientSearchParamsGet } from '$lib/utils/clientSearchParamsGet';

  interface Props {
    fullScreen: boolean;
  }

  const { fullScreen }: Props = $props();

  let houseData: HouseData | undefined = $state(undefined);
  let searchValue = $state('');
  let loading = $state(true);
  const { showModal } = getMsgModalContext();

  onMount(() => {
    const abortController = new AbortController();
    getHousingData(abortController.signal)
      .then((data) => {
        houseData = data;
        loading = false;
      })
      .catch((error: unknown) => {
        console.error('Error fetching housing data:', error);
        showModal({
          title: msg['housing.cannot_load.title'](),
          message: msg['housing.cannot_load.desc'](),
        });
      });

    return () => {
      abortController.abort();
    };
  });

  const onSearch: FormEventHandler<HTMLInputElement> = (event) => {
    searchValue = event.currentTarget.value;
    if (clientSearchParamsGet('hf')) {
      const newParams = new SvelteURLSearchParams(clientSearchParams());
      newParams.delete('hf');
      goto(`?${newParams.toString()}`);
    }
  };

  const filteredHouses = $derived(
    houses.filter((house) => {
      const searchLower = searchValue.trim().toLowerCase();
      return (
        house.name.toLowerCase().includes(searchLower) ||
        (houseData?.[house.name].ownerName || msg['housing.vacant']())
          .toLowerCase()
          .includes(searchLower)
      );
    }),
  );

  let sortValue = $state('name');

  const handleSortChange = (id: string) => {
    sortValue = id;
  };

  const sortedHouses = $derived.by(() => {
    switch (sortValue) {
      case 'name':
        return filteredHouses.toSorted((a, b) => {
          const houseA = houseData?.[a.name];
          const houseB = houseData?.[b.name];
          return (houseA?.ownerName || '').localeCompare(houseB?.ownerName || '');
        });
      case 'id':
        return filteredHouses.toSorted((a, b) => a.name.localeCompare(b.name));
      case 'rentLeft':
        return filteredHouses.toSorted((a, b) => {
          const houseA = houseData?.[a.name];
          const houseB = houseData?.[b.name];
          const aRentLeft = houseA?.ownerName ? houseA.rentLeft.getTime() || 0 : -Infinity;
          const bRentLeft = houseB?.ownerName ? houseB.rentLeft.getTime() || 0 : -Infinity;
          return aRentLeft - bRentLeft;
        });
      // case 'depotStorage':
      //   // TODO: not implemented yet
      //   return filteredHouses.toSorted((a, b) => a.name.localeCompare(b.name));
      default:
        return filteredHouses;
    }
  });

  $effect(() => {
    if (clientSearchParamsGet('hf')) {
      searchValue = clientSearchParamsGet('hf') || '';
    }
  });
</script>

<div class="flex h-full flex-col">
  <CommonHead>{msg['housing.title']()}</CommonHead>
  <div class={['flex flex-col justify-between gap-2 px-8 pb-8', fullScreen && 'sm:flex-row']}>
    <TextInput
      value={searchValue}
      placeholder={msg['housing.search_placeholder']()}
      name="search"
      type="search"
      class={['w-full min-w-0', fullScreen && 'sm:max-w-80 sm:flex-1']}
      onInput={onSearch}
      disabled={!houseData}
      onClear={() => (searchValue = '')}
    />
    <Select
      value={sortValue}
      name="sort"
      onChange={handleSortChange}
      class={['w-full flex-shrink-0', fullScreen && 'sm:max-w-45']}
    >
      <SelectOption id="name" value={msg['housing.sort.name']()} />
      <SelectOption id="id" value={msg['housing.sort.id']()} />
      <SelectOption id="rentLeft" value={msg['housing.sort.rent_left']()} />
      <!-- <SelectOption id="depotStorage" value={msg['housing.sort.depot_storage']()} /> -->
    </Select>
  </div>
  <div class="overflow-y-scroll">
    <div
      class={[
        'grid justify-items-stretch gap-8 px-8 pb-8',
        fullScreen && 'sm:grid-cols-[repeat(auto-fill,_minmax(calc(var(--spacing)_*_80),_1fr))]',
      ]}
    >
      {#each sortedHouses as house (house.name)}
        <HouseCard {house} {houseData} highlight={searchValue} {loading} />
      {/each}
    </div>
  </div>
</div>
