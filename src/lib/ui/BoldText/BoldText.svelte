<script lang="ts">
  import type { ClassValue } from 'svelte/elements';

  type BoldTextProps = {
    text: string;
    boldPart: string;
    caseInSensitive?: boolean;
    /**
     * CSS class to apply to the bold part of the text
     */
    class?: ClassValue;
  };
  const { text, boldPart, caseInSensitive, class: propsClassname }: BoldTextProps = $props();

  const boldCaseSensitive = $derived(caseInSensitive ? boldPart.toLowerCase() : boldPart);

  const parts = $derived.by(() => {
    if (!boldCaseSensitive) return [{ text, bold: false }];
    const result = [];
    let remaining = text;
    let idx;
    while (
      (idx = (caseInSensitive ? remaining.toLowerCase() : remaining).indexOf(boldCaseSensitive)) !==
      -1
    ) {
      if (idx > 0) {
        result.push({ text: remaining.slice(0, idx), bold: false });
      }
      result.push({ text: remaining.slice(idx, idx + boldCaseSensitive.length), bold: true });
      remaining = remaining.slice(idx + boldCaseSensitive.length);
    }
    if (remaining) {
      result.push({ text: remaining, bold: false });
    }
    return result;
  });
</script>

<span class="contents">
  {#each parts as { text, bold }, i (i)}
    {#if bold}<b class={propsClassname}>{text}</b>{:else}{text}{/if}
  {/each}
</span>
