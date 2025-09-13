<script lang="ts">
  import { marked } from 'marked';
  import DOMPurify from 'dompurify';

  export interface MarkdownTextProps {
    /**
     * The markdown text to render
     */
    text: string;
    /**
     * The size of the prose text
     * @default 'md'
     */
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    /**
     * Skip HTML sanitization. Only use this when you know the content is fully safe
     * (i.e. from static text or i18n messages). Never use with user-generated content.
     * @default false
     */
    noSanitize?: boolean;
  }

  const { size = 'md', text, noSanitize }: MarkdownTextProps = $props();

  const sanitizedHtml = $derived.by(() => {
    const rawHtml = marked(text.trim(), { async: false });
    return noSanitize ? rawHtml : DOMPurify.sanitize(rawHtml);
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
      for (const child of Array.from(element.children)) {
        walkChildren(child);
      }
    };

    for (const child of Array.from(textContainer.children)) {
      walkChildren(child);
    }
  });

  const proseSize = $derived.by(() => {
    switch (size) {
      case 'sm':
        return 'prose-sm';
      case 'md':
        return 'prose-base';
      case 'lg':
        return 'prose-lg';
      case 'xl':
        return 'prose-xl';
      case '2xl':
        return 'prose-2xl';
    }
  });
</script>

<section
  class={['prose dark:prose-invert prose-neutral !prose-cyan contents', proseSize]}
  bind:this={textContainer}
>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html sanitizedHtml}
</section>
