<script lang="ts">
  import { marked } from 'marked';
  import DOMPurify from 'dompurify';
  import HydrationSkip from './HydrationSkip.svelte';

  // @unocss-skip-start
  export interface MarkdownTextProps {
    /**
     * The markdown text to render
     */
    text: string;
    /**
     * The size of the prose text. This also load prose classes (it huge)
     * @default 'prose-base'
     */
    size?: 'prose-sm' | 'prose-base' | 'prose-lg' | 'prose-xl' | 'prose-2xl';
    /**
     * Skip HTML sanitization. Only use this when you know the content is fully safe
     * (i.e. from static text or i18n messages). Never use with user-generated content.
     * @default false
     */
    noSanitize?: boolean;
  }
  // @unocss-skip-end

  const { size = 'prose-base', text, noSanitize }: MarkdownTextProps = $props();

  const sanitizedHtml = $derived.by(() => {
    const rawHtml = marked(text.trim(), { async: false });
    return noSanitize ? rawHtml : DOMPurify.sanitize(rawHtml);
  });

  let textContainer: HTMLSpanElement | undefined;
</script>

<section
  class={['prose dark:prose-invert prose-neutral !prose-cyan contents', size]}
  bind:this={textContainer}
>
  <HydrationSkip markup={sanitizedHtml} />
</section>
