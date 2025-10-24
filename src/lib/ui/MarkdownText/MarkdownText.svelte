<script module lang="ts">
  // eslint-disable-next-line @typescript-eslint/no-restricted-imports
  import { format, formatDistanceToNow } from 'date-fns';

  const dcTimeFormat = {
    F: 'PPPPp',
    f: 'PPPp',
    D: 'PPP',
    d: 'P',
    t: 'p',
    T: 'pp',
  } as const;

  type DiscordTimeFormat = keyof typeof dcTimeFormat | 'R';

  interface DiscordTimeToken extends Tokens.Generic {
    type: 'discordTime';
    timestamp: number;
    formatKey: DiscordTimeFormat;
  }

  interface DiscordMentionsToken extends Tokens.Generic {
    type: 'discordMentions';
    id: string;
  }

  const discordTime: TokenizerAndRendererExtension = {
    name: 'discordTime',
    //unocss-skip-start
    level: 'inline',
    //unocss-skip-end
    start(src: string) {
      return /<t:/.exec(src)?.index;
    },
    tokenizer(src: string) {
      // Match Discord time format: <t:1761327563:d>
      const rule = /^<t:(\d+):([FfDdtTR])>/;
      const match = rule.exec(src);

      if (match) {
        const token: DiscordTimeToken = {
          type: 'discordTime',
          raw: match[0],
          timestamp: parseInt(match[1], 10),
          formatKey: match[2] as DiscordTimeFormat,
        };
        return token;
      }
    },
    renderer(token: Tokens.Generic) {
      const discordToken = token as DiscordTimeToken;
      const { timestamp, formatKey } = discordToken;

      // Convert Unix timestamp (seconds) to Date
      const date = new Date(timestamp * 1000);

      return `<time datetime="${date.toISOString()}">${
        formatKey === 'R'
          ? formatDistanceToNow(date, { addSuffix: true })
          : format(date, dcTimeFormat[formatKey])
      }</time>`;
    },
  };

  const discordMentions: TokenizerAndRendererExtension = {
    name: 'discordMentions',
    //unocss-skip-start
    level: 'inline',
    //unocss-skip-end
    start(src: string) {
      return /<@/.exec(src)?.index;
    },
    tokenizer(src: string) {
      // Match Discord time format: <t:1761327563:d>
      const rule = /^<@(\d+)>/;
      const match = rule.exec(src);

      if (match) {
        const token: DiscordMentionsToken = {
          type: 'discordMentions',
          raw: match[0],
          id: match[1],
        };
        return token;
      }
    },
    renderer(token: Tokens.Generic) {
      const discordToken = token as DiscordMentionsToken;
      const { id } = discordToken;

      return `@${id}`;
    },
  };

  marked.use({ extensions: [discordTime, discordMentions] });
</script>

<script lang="ts">
  import { marked, type Tokens, type TokenizerAndRendererExtension } from 'marked';
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

  let renderer = new marked.Renderer();
  renderer.link = function (token: Tokens.Link) {
    var link = marked.Renderer.prototype.link.call(this, token);
    if (token.href.startsWith('/downloads/')) {
      return link.replace('<a', '<a download');
    }
    return link.replace('<a', "<a target='_blank' rel='noreferrer'");
  };

  const sanitizedHtml = $derived.by(() => {
    const rawHtml = marked(text.trim(), {
      async: false,
      renderer,
    });
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
