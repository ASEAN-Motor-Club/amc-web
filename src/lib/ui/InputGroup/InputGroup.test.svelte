<script lang="ts">
  import type { Snippet } from 'svelte';
  import InputGroup from './InputGroup.svelte';
  import TextInput from '../TextInput/TextInput.svelte';

  interface Props {
    label?: string;
    focusIndex?: number;
    twoChildren?: boolean;
    appendLabel?: Snippet;
  }

  const { label = 'Volume', focusIndex, twoChildren = false, appendLabel }: Props = $props();
</script>

<InputGroup {label} {focusIndex} {appendLabel}>
  <TextInput name="vol" value={0} />
  {#if twoChildren}
    <TextInput name="vol2" value={0} />
  {/if}
</InputGroup>
