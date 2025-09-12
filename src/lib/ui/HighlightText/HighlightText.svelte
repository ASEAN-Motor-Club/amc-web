<script lang="ts">
  import type { ClassValue } from 'svelte/elements';

  interface HighlightTextProps {
    text: string;
    highlight: string;
    caseInSensitive?: boolean;
    /**
     * CSS class to apply to the highlight part of the text
     */
    highlightClass?: ClassValue;
    /**
     * Highlight text tag
     * @default 'b'
     */
    tag?: string;
  }
  const {
    text,
    highlight,
    caseInSensitive,
    highlightClass,
    tag = 'b',
  }: HighlightTextProps = $props();

  const highlightCaseSensitive = $derived(caseInSensitive ? highlight.toLowerCase() : highlight);

  const parts = $derived.by(() => {
    if (!highlightCaseSensitive) return [{ text, highlight: false }];
    const result = [];
    let remaining = text;
    let idx;
    while (
      (idx = (caseInSensitive ? remaining.toLowerCase() : remaining).indexOf(
        highlightCaseSensitive,
      )) !== -1
    ) {
      if (idx > 0) {
        result.push({ text: remaining.slice(0, idx), highlight: false });
      }
      result.push({
        text: remaining.slice(idx, idx + highlightCaseSensitive.length),
        highlight: true,
      });
      remaining = remaining.slice(idx + highlightCaseSensitive.length);
    }
    if (remaining) {
      result.push({ text: remaining, highlight: false });
    }
    return result;
  });
</script>

<span class="contents">
  {#each parts as { text, highlight }, i (i)}{#if highlight}<svelte:element
        this={tag}
        class={highlightClass}>{text}</svelte:element
      >{:else}{text}{/if}{/each}
</span>
