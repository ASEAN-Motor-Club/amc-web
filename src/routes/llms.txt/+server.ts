import { siteOrigin, type sitemapPaths } from '#lib/data/site.ts';
import { m } from '#messages';
import { PUBLIC_DISCORD_LINK } from '$app/env/public';

export const prerender = true;

interface LlmsPage {
  title: () => string;
  description?: () => string;
}

/** Keyed by sitemap path so a new indexable route fails typecheck until it is described here. */
const pages: Record<Exclude<(typeof sitemapPaths)[number], '/'>, LlmsPage> = {
  '/map': { title: () => m['navbar.map']() },
  '/players': { title: () => m['players.title']() },
  '/housing': { title: () => m['housing.title']() },
  '/jobs': { title: () => m['jobs.title']() },
  '/deliveries': { title: () => m['delivery.title']() },
  '/radio': { title: () => m['radio.title']() },
  '/track': { title: () => m['track_editor.title']() },
  '/pak/conflict': {
    title: () => m['pak.conflict.title'](),
    description: () => m['pak.conflict.description'](),
  },
  '/pak/inspect': {
    title: () => m['pak.inspect.title'](),
    description: () => m['pak.inspect.description'](),
  },
};

const link = (label: string, href: string, description?: string) =>
  `- [${label}](${href})${description ? `: ${description}` : ''}`;

export const GET = () => {
  const pageLinks = Object.entries(pages).map(([path, { title, description }]) =>
    link(title(), new URL(path, siteOrigin).href, description?.()),
  );
  const communityLinks = [
    link(m['navbar.wiki'](), 'https://wiki.aseanmotorclub.com/'),
    ...(PUBLIC_DISCORD_LINK ? [link(m['home.join_discord'](), PUBLIC_DISCORD_LINK)] : []),
  ];

  return new Response(
    [
      `# ${m.site_name()}`,
      `> ${m['home.desc_title']()}`,
      m['home.description'](),
      `## Pages\n\n${pageLinks.join('\n')}`,
      `## Community\n\n${communityLinks.join('\n')}`,
    ].join('\n\n') + '\n',
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
};
