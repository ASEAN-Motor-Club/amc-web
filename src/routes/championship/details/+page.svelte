<script>
  import '#lib/font-sans-em.ts';
  import { PUBLIC_SEASON_START_DATE } from '$app/env/public';
  import CalendarGroup from '#lib/components/Championship/CalendarGroup.svelte';
  import Standing from '#lib/components/Championship/Standing.svelte';
  import { m } from '#messages';
  import { format } from '#lib/date.ts';

  const startDate = new Date(PUBLIC_SEASON_START_DATE);
</script>

<div class="flex w-full flex-col items-center justify-center p-8 lg:p-16 xl:h-full">
  <h3 class="pt-8 pb-5 font-semibold text-text-600 dark:text-text-400">
    {m['championship.starting_from']({
      date: format(startDate, m['format.dateFull']()),
    })}
  </h3>
  <h1 class="pb-12 text-center font-sans-em text-4xl font-bold tracking-wide sm:text-7xl xl:pb-20">
    {m['championship.title']()}
  </h1>
  <div class="grid w-full grid-cols-1 place-items-center gap-10 xl:w-[unset] xl:grid-cols-2">
    <div class="max-w-full">
      <h4 class="mb-8 text-center text-4xl font-semibold tracking-tight">
        {m['championship.standing']()}
      </h4>
      <Standing />
    </div>
    <div class="max-w-full">
      <h4 class="mb-8 text-center text-4xl font-semibold tracking-tight">
        {m['championship.schedule']()}
      </h4>
      <CalendarGroup />
    </div>
  </div>
</div>
