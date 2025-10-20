<script lang="ts">
  import type { DeliveryJob } from '$lib/api/types';
  import CommonHead from '$lib/components/CommonHead/CommonHead.svelte';
  import { m as msg } from '$lib/paraglide/messages';
  import JobCard from '$lib/components/Jobs/JobCard.svelte';

  interface Props {
    jobsData: DeliveryJob[];
    loading: boolean;
    fullScreen: boolean;
  }

  const { jobsData, loading, fullScreen }: Props = $props();
</script>

<div class="flex h-full flex-col">
  <CommonHead>{msg['jobs.title']()}</CommonHead>
  <div class={loading ? 'overflow-y-hidden' : 'overflow-y-auto'}>
    {#if loading || jobsData.length > 0}
      <div
        class={[
          'grid justify-items-stretch gap-8 px-8 pb-8',
          fullScreen && 'sm:grid-cols-[repeat(auto-fill,_minmax(calc(var(--spacing)_*_100),_1fr))]',
        ]}
      >
        {#if loading}
          {#each Array(50) as _, i (i)}
            <JobCard {fullScreen} loading />
          {/each}
        {:else}
          {#each jobsData as job (job.id)}
            <JobCard {fullScreen} {job} />
          {/each}
        {/if}
      </div>
    {:else}
      <div class="p-8 text-center text-sm text-gray-500">
        {msg['jobs.no_jobs']()}
      </div>
    {/if}
  </div>
</div>
