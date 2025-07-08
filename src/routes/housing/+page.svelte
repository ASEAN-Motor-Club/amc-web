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
  import { m } from '$lib/paraglide/messages';
  import { getMsgModalContext } from '$lib/components/MsgModal/context';

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
      .catch((error) => {
        console.error('Error fetching housing data:', error);
        showModal({
          title: m['housing.cannot_load.title'](),
          message: m['housing.cannot_load.desc'](),
        });
      });

    return () => {
      abortController.abort();
    };
  });

  const onSearch: FormEventHandler<HTMLInputElement> = (event) => {
    searchValue = event.currentTarget.value;
  };

  const filteredHouses = $derived(
    houses.filter((house) => {
      const searchLower = searchValue.trim().toLowerCase();
      return (
        house.name.toLowerCase().includes(searchLower) ||
        houseData?.[house.name].ownerName.toLowerCase().includes(searchLower)
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
        return filteredHouses.toSorted((a, b) => a.name.localeCompare(b.name));
      case 'rentLeft':
        return filteredHouses.toSorted((a, b) => {
          const aRentLeft = houseData?.[a.name]?.rentLeft.getTime() || 0;
          const bRentLeft = houseData?.[b.name]?.rentLeft.getTime() || 0;
          return aRentLeft - bRentLeft;
        });
      case 'depotStorage':
        // TODO: not implemented yet
        return filteredHouses.toSorted((a, b) => a.name.localeCompare(b.name));
      default:
        return filteredHouses;
    }
  });
</script>

<svelte:head>
  <title>{m['housing.head']({ siteName: m['site_name_short']() })}</title>
</svelte:head>

<CommonHead>{m['housing.title']()}</CommonHead>
<div class="flex flex-col justify-between gap-2 px-8 sm:flex-row">
  <TextInput
    value={searchValue}
    placeholder={m['housing.search_placeholder']()}
    name="search"
    type="search"
    class="w-full min-w-0 sm:max-w-80 sm:flex-1"
    additionalAttributes={{
      oninput: onSearch,
    }}
    disabled={!houseData}
  />
  <Select
    value={sortValue}
    name="sort"
    onChange={handleSortChange}
    class="sm:max-w-45 w-full flex-shrink-0"
  >
    <SelectOption id="name" value={m['housing.sort.name']()}>
      {m['housing.sort.name']()}
    </SelectOption>
    <SelectOption id="rentLeft" value={m['housing.sort.rent_left']()}>
      {m['housing.sort.rent_left']()}
    </SelectOption>
    <SelectOption id="depotStorage" value={m['housing.sort.depot_storage']()}>
      {m['housing.sort.depot_storage']()}
    </SelectOption>
  </Select>
</div>
<div
  class="grid justify-items-stretch gap-8 p-8 sm:grid-cols-[repeat(auto-fill,_minmax(calc(var(--spacing)_*_80),_1fr))]"
>
  {#each sortedHouses as house (house.name)}
    <HouseCard {house} {houseData} highlight={searchValue} {loading} />
  {/each}
</div>
