<script>
  import { PUBLIC_SEASON_START_DATE } from '$env/static/public';
  import CalendarGroup from '$lib/components/Championship/CalendarGroup.svelte';
  import Standing from '$lib/components/Championship/Standing.svelte';
  import { siteLocale } from '$lib/components/Locale/locale.svelte';
  import { format } from '$lib/date';

  const startDate = new Date(PUBLIC_SEASON_START_DATE);
</script>

<div class="flex w-full flex-col items-center justify-center p-8 lg:p-16 xl:h-full">
  <h3 class="pb-5 pt-8 font-semibold">
    {siteLocale.msg['championship.starting_from']({
      date: format(startDate, siteLocale.msg['format.dateFull']()),
    })}
  </h3>
  <h1 class="font-sans-alt pb-12 text-center text-4xl font-bold sm:text-7xl xl:pb-20">
    {siteLocale.msg['championship.title']()}
  </h1>
  <div class="xl:w-unset grid w-full grid-cols-1 place-items-center gap-10 xl:grid-cols-2">
    <div class="max-w-full">
      <h4 class="mb-8 text-center text-4xl font-semibold tracking-tight">
        {siteLocale.msg['championship.standing']()}
      </h4>
      <Standing />
    </div>
    <div class="max-w-full">
      <h4 class="mb-8 text-center text-4xl font-semibold tracking-tight">
        {siteLocale.msg['championship.schedule']()}
      </h4>
      <CalendarGroup />
    </div>
  </div>
</div>
