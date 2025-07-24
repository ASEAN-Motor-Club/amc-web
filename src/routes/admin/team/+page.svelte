<script lang="ts">
  import { m } from '$lib/paraglide/messages';
  import TeamCard from '$lib/components/Championship/TeamCard.svelte';
  import type { Team } from '$lib/components/Championship/types';
  import TextInput from '$lib/ui/TextInput/TextInput.svelte';
  import Select from '$lib/ui/Select/Select.svelte';
  import Button from '$lib/ui/Button/Button.svelte';
  import Card from '$lib/ui/Card/Card.svelte';
  import Icon from '$lib/ui/Icon/Icon.svelte';
  import { checkContrastCompliance, isValidHexColor } from '$lib/utils/colorContrast';
  import SelectOption from '$lib/ui/Select/SelectOption.svelte';
  import { teams as availableTeams } from '$lib/data/teams';

  // Team state
  let team: Team = $state({
    ...availableTeams[1],
  });

  // Handle team selection
  const handleTeamChange = (selectedTag: string) => {
    const selectedTeam = availableTeams.find((t) => t.tag === selectedTag);
    if (selectedTeam) {
      team.tag = selectedTeam.tag;
      team.name = selectedTeam.name;
      team.link = selectedTeam.link;
      team.description = selectedTeam.description;
      team.bg = selectedTeam.bg;
      team.text = selectedTeam.text;
      team.logo = selectedTeam.logo || '';
    }
  };

  // Validation states
  let bgColorValid = $derived(isValidHexColor(team.bg));
  let textColorValid = $derived(isValidHexColor(team.text));
  let contrastResult = $derived(
    bgColorValid && textColorValid ? checkContrastCompliance(team.bg, team.text) : null,
  );

  // File input reference
  let fileInput: HTMLInputElement;

  const handleLogoUpload = (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        team.logo = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const clearLogo = () => {
    team.logo = '';
    if (fileInput) fileInput.value = '';
  };

  const teamOmitLogo = $derived({ ...team, logo: undefined });

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(teamOmitLogo, null, 2));
      // You could add a toast notification here if available
      alert('Team data copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  // Reactive JSON output
  let jsonOutput = $derived(JSON.stringify(teamOmitLogo, null, 2));
</script>

<svelte:head>
  <title>{m['site_name_short']()} | Team Picker</title>
</svelte:head>

<div class="container mx-auto max-w-6xl p-8">
  <h1 class="mb-8 text-4xl font-bold tracking-tight">Team Picker</h1>

  <div class="grid gap-8 lg:grid-cols-2">
    <!-- Form Section -->
    <div class="space-y-6">
      <Card class="p-6">
        <h2 class="mb-4 text-2xl font-semibold">Team Configuration</h2>

        <!-- Team Tag Dropdown -->
        <div class="mb-4">
          <label for="tag" class="mb-2 block text-sm font-medium">Team Tag</label>
          <Select
            value={team.tag}
            name="tag"
            placeholder="Select team tag"
            onChange={handleTeamChange}
          >
            {#each availableTeams as teamOption (teamOption.tag)}
              <SelectOption id={teamOption.tag} value="{teamOption.tag} - {teamOption.name}"
                >{teamOption.tag} - {teamOption.name}</SelectOption
              >
            {/each}
          </Select>
        </div>

        <!-- Team Info Display -->
        <div class="mb-4 rounded-md bg-neutral-50 p-4 dark:bg-neutral-800">
          <div class="mb-2">
            <span class="text-sm font-medium text-neutral-600 dark:text-neutral-400"
              >Team Name:</span
            >
            <p class="text-sm">{team.name}</p>
          </div>
          <div>
            <span class="text-sm font-medium text-neutral-600 dark:text-neutral-400"
              >Team Link:</span
            >
            <p class="break-all text-sm">{team.link}</p>
          </div>
        </div>

        <!-- Team Description -->
        <div class="mb-4">
          <label for="description" class="mb-2 block text-sm font-medium">Description</label>
          <textarea
            bind:value={team.description}
            name="description"
            placeholder="Enter team description"
            class="w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-600 dark:bg-neutral-800"
            rows="3"
          ></textarea>
        </div>

        <!-- Colors -->
        <div class="mb-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label for="bg" class="mb-2 block text-sm font-medium">Background Color</label>
            <div class="flex gap-2">
              <input
                type="color"
                bind:value={team.bg}
                class="h-10 w-12 rounded border border-neutral-300 dark:border-neutral-600"
              />
              <TextInput
                value={team.bg}
                name="bg"
                placeholder="#000000"
                class="flex-1"
                onChange={(e) => (team.bg = e.currentTarget.value)}
              />
            </div>
            {#if !bgColorValid}
              <p class="text-error-500 mt-1 text-sm">Invalid hex color format</p>
            {/if}
          </div>

          <div>
            <label for="text" class="mb-2 block text-sm font-medium">Text Color</label>
            <div class="flex gap-2">
              <input
                type="color"
                bind:value={team.text}
                class="h-10 w-12 rounded border border-neutral-300 dark:border-neutral-600"
              />
              <TextInput
                value={team.text}
                name="text"
                placeholder="#ffffff"
                class="flex-1"
                onChange={(e) => (team.text = e.currentTarget.value)}
              />
            </div>
            {#if !textColorValid}
              <p class="text-error-500 mt-1 text-sm">Invalid hex color format</p>
            {/if}
          </div>
        </div>

        <!-- Contrast Warning -->
        {#if contrastResult}
          <div
            class="mb-4 rounded-md p-3 {contrastResult.passesAA
              ? 'bg-success-100 dark:bg-success-900'
              : 'bg-warning-100 dark:bg-warning-900'}"
          >
            <div class="flex items-center gap-2">
              <Icon
                class={contrastResult.passesAA
                  ? 'i-material-symbols:check-circle-rounded text-success-600'
                  : 'i-material-symbols:warning-rounded text-warning-600'}
                size="sm"
              />
              <span class="text-sm font-medium">
                Contrast Ratio: {contrastResult.ratio.toFixed(2)}:1
              </span>
            </div>
            {#if !contrastResult.passesAA}
              <p class="text-warning-700 dark:text-warning-300 mt-1 text-sm">
                ⚠️ This color combination might be hard to read for some people
              </p>
            {:else}
              <p class="text-success-700 dark:text-success-300 mt-1 text-sm">
                ✅ This color combination looks great and is easy to read!
                {contrastResult.passesAAA ? '(Perfect for everyone!)' : ''}
              </p>
            {/if}
          </div>
        {/if}

        <!-- Logo Upload -->
        <div class="mb-4">
          <label for="logo" class="mb-2 block text-sm font-medium"
            >Team Logo (320x320 preferred)</label
          >
          <div class="flex gap-2">
            <input
              bind:this={fileInput}
              type="file"
              accept="image/*"
              onchange={handleLogoUpload}
              class="flex-1 rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-600 dark:bg-neutral-800"
            />
            {#if team.logo}
              <Button onClick={clearLogo} color="error">
                <Icon class="i-material-symbols:delete-rounded" size="sm" />
                Clear
              </Button>
            {/if}
          </div>
          {#if team.logo}
            <div class="mt-2">
              <img src={team.logo} alt="Logo preview" class="size-16 rounded object-cover" />
            </div>
          {/if}
        </div>
      </Card>
    </div>

    <!-- Preview Section -->
    <div class="space-y-6">
      <Card class="p-6">
        <h2 class="mb-4 text-2xl font-semibold">Preview</h2>
        <TeamCard {team} />
      </Card>

      <!-- JSON Output -->
      <Card class="p-6">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-2xl font-semibold">JSON Output</h2>
          <Button onClick={copyToClipboard}>
            <Icon class="i-material-symbols:content-copy-rounded" size="sm" />
            Copy
          </Button>
        </div>
        <pre
          class="overflow-x-auto rounded bg-neutral-100 p-4 text-sm dark:bg-neutral-800">{jsonOutput}</pre>
      </Card>
    </div>
  </div>
</div>
