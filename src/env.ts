import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
  PUBLIC_DISCORD_LINK: { public: true, static: true },
  PUBLIC_PATREON_LINK: { public: true, static: true },
  PUBLIC_RADIO_STREAM_URL: { public: true, static: true },
  PUBLIC_SEASON_NO: { public: true, static: true },
  PUBLIC_SEASON_START_DATE: { public: true, static: true },
  PUBLIC_DISCORD_EVENT_BASE: { public: true, static: true },
  PUBLIC_HOUSE_PRICE_MULTIPLIER: { public: true, static: true },
  PUBLIC_API_BASE: { public: true, static: true },
});
