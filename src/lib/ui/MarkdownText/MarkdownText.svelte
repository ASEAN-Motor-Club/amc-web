<script lang="ts">
  import { marked } from 'marked';
  import DOMPurify from 'dompurify';

  export interface MarkdownTextProps {
    text: string;
  }

  const { text }: MarkdownTextProps = $props();

  const sanitizedHtml = $derived.by(() => {
    const rawHtml = marked(text.trim(), { async: false });
    return DOMPurify.sanitize(rawHtml);
  });

  let textContainer: HTMLSpanElement | undefined;

  $effect(() => {
    if (!textContainer?.innerHTML) {
      return;
    }
    const walkChildren = (element: Element) => {
      if (element instanceof HTMLAnchorElement) {
        element.target = '_blank';
        element.rel = 'noreferrer';
      }
      Array.from(element.children).forEach(walkChildren);
    };

    Array.from(textContainer.children).forEach(walkChildren);
  });
</script>

<div class="contents" bind:this={textContainer}>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html sanitizedHtml}
</div>
