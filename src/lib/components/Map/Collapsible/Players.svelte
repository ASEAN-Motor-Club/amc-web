<script lang="ts">
  import TextInput from '$lib/ui/TextInput/TextInput.svelte';
  import type { FormEventHandler } from 'svelte/elements';
  import CommonHead from '$lib/components/CommonHead/CommonHead.svelte';
  import { siteLocale } from '$lib/components/Locale/locale.svelte';
  import { SvelteURLSearchParams } from 'svelte/reactivity';
  import { goto } from '$app/navigation';
  import { clientSearchParams, clientSearchParamsGet } from '$lib/utils/clientSearchParamsGet';
  import type { PlayerData } from '../Map/types';
  import PlayerCard from '$lib/components/Players/PlayerCard.svelte';

  interface Props {
    playerData: PlayerData[];
    fullScreen: boolean;
    onCenter: (point: [number, number]) => void;
  }

  const { playerData, fullScreen, onCenter }: Props = $props();

  let searchValue = $state('');

  const onSearch: FormEventHandler<HTMLInputElement> = (event) => {
    searchValue = event.currentTarget.value;
    if (clientSearchParamsGet('hf')) {
      const newParams = new SvelteURLSearchParams(clientSearchParams());
      newParams.delete('hf');
      goto(`?${newParams.toString()}`);
    }
  };

  const filteredPlayers = $derived(
    playerData.filter((player) => {
      const searchLower = searchValue.trim().toLowerCase();
      return player.name.toLowerCase().includes(searchLower);
    }),
  );
</script>

<div class="flex h-full flex-col">
  <CommonHead>{siteLocale.msg['players.title']()}</CommonHead>
  <div class={['flex flex-col justify-between gap-2 px-8 pb-8', fullScreen && 'sm:flex-row']}>
    <TextInput
      value={searchValue}
      placeholder={siteLocale.msg['players.search_placeholder']()}
      name="search"
      type="search"
      class={['w-full min-w-0', fullScreen && 'sm:max-w-80 sm:flex-1']}
      onInput={onSearch}
      onClear={() => (searchValue = '')}
    />
  </div>
  <div class="overflow-y-scroll">
    <div
      class="grid grid-cols-[repeat(auto-fill,_minmax(calc(var(--spacing)_*_80),_1fr))] justify-items-stretch gap-8 px-8 pb-8"
    >
      {#each filteredPlayers as player (player.name)}
        <PlayerCard {player} highlight={searchValue} {onCenter} />
      {/each}
    </div>
  </div>
</div>
