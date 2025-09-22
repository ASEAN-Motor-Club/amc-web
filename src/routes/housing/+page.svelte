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
  import { siteLocale } from '$lib/components/Locale/locale.svelte';
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
      .catch((error: unknown) => {
        console.error('Error fetching housing data:', error);
        showModal({
          title: siteLocale.msg['housing.cannot_load.title'](),
          message: siteLocale.msg['housing.cannot_load.desc'](),
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
        (houseData?.[house.name].ownerName || siteLocale.msg['housing.vacant']())
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
</script>

<svelte:head>
  <title
    >{siteLocale.msg['housing.head']({
      siteName: siteLocale.msg.site_name_short(),
    })}</title
  >
</svelte:head>

<CommonHead>{siteLocale.msg['housing.title']()}</CommonHead>
<div class="flex flex-col justify-between gap-2 px-8 sm:flex-row">
  <TextInput
    value={searchValue}
    placeholder={siteLocale.msg['housing.search_placeholder']()}
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
    <SelectOption id="name" value={siteLocale.msg['housing.sort.name']()} />
    <SelectOption id="id" value={siteLocale.msg['housing.sort.id']()} />
    <SelectOption id="rentLeft" value={siteLocale.msg['housing.sort.rent_left']()} />
    <!-- <SelectOption id="depotStorage" value={siteLocale.msg['housing.sort.depot_storage']()} /> -->
  </Select>
</div>
<div
  class="grid justify-items-stretch gap-8 p-8 sm:grid-cols-[repeat(auto-fill,_minmax(calc(var(--spacing)_*_80),_1fr))]"
>
  {#each sortedHouses as house (house.name)}
    <HouseCard {house} {houseData} highlight={searchValue} {loading} />
  {/each}
</div>
