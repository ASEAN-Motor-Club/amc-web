<script lang="ts">
  import type { DeliveryJob } from '$lib/api/types';
  import CommonHead from '$lib/components/CommonHead/CommonHead.svelte';
  import { m as msg } from '$lib/paraglide/messages';
  import JobCard from '$lib/components/Map/Jobs/JobCard.svelte';
  import { censored } from '$lib/censored.svelte';

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
      <div class="text-text/60 dark:text-text-dark/60 p-8 text-center text-sm">
        {censored.c ? msg['jobs.no_jobs_c']() : msg['jobs.no_jobs']()}
      </div>
    {/if}
  </div>
</div>
