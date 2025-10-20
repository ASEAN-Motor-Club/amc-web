<script lang="ts">
  import TextInput from '$lib/ui/TextInput/TextInput.svelte';
  import type { FormEventHandler } from 'svelte/elements';
  import CommonHead from '$lib/components/CommonHead/CommonHead.svelte';
  import { m as msg } from '$lib/paraglide/messages';
  import { SvelteURLSearchParams } from 'svelte/reactivity';
  import { goto } from '$app/navigation';
  import { clientSearchParams, clientSearchParamsGet } from '$lib/utils/clientSearchParamsGet';
  import type { PlayerData } from '../Map/types';
  import PlayerCard from '$lib/components/Players/PlayerCard.svelte';

  interface Props {
    playerData: PlayerData[];
    playerDataLoading: boolean;
    fullScreen: boolean;
    onCenter: (point: [number, number]) => void;
  }

  const { playerData, playerDataLoading, fullScreen, onCenter }: Props = $props();

  let searchValue = $state('');

  const onSearch: FormEventHandler<HTMLInputElement> = (event) => {
    searchValue = event.currentTarget.value;
    if (clientSearchParamsGet('hf')) {
      const newParams = new SvelteURLSearchParams(clientSearchParams());
      newParams.delete('hf');
      goto(`?${newParams.toString()}`);
    }
  };

  const filteredPlayers = $derived.by(() => {
    const searchLower = searchValue.trim().toLowerCase();
    return playerData.filter((player) => {
      return player.name.toLowerCase().includes(searchLower);
    });
  });
</script>

<div class="flex h-full flex-col">
  <CommonHead>{msg['players.title']()}</CommonHead>
  <div class={['flex flex-col justify-between gap-2 px-8 pb-8', fullScreen && 'sm:flex-row']}>
    <TextInput
      value={searchValue}
      placeholder={msg['players.search_placeholder']()}
      name="search"
      type="search"
      class={['w-full min-w-0', fullScreen && 'sm:max-w-80 sm:flex-1']}
      onInput={onSearch}
      onClear={() => (searchValue = '')}
    />
  </div>
  <div class={playerDataLoading ? 'overflow-y-hidden' : 'overflow-y-auto'}>
    {#if playerDataLoading || filteredPlayers.length > 0}
      <div
        class="grid grid-cols-[repeat(auto-fill,_minmax(calc(var(--spacing)_*_80),_1fr))] justify-items-stretch gap-8 px-8 pb-8"
      >
        {#if playerDataLoading}
          {#each Array(50) as _, i (i)}
            <PlayerCard highlight={searchValue} {onCenter} loading />
          {/each}
        {:else}
          {#each filteredPlayers as player (player.name)}
            <PlayerCard {player} highlight={searchValue} {onCenter} />
          {/each}
        {/if}
      </div>
    {:else}
      <div class="text-text/60 dark:text-text-dark/60 p-8 text-center text-sm">
        {#if playerData.length === 0}
          {msg['players.no_players']()}
        {:else}
          {msg['players.no_results']()}
        {/if}
      </div>
    {/if}
  </div>
</div>
