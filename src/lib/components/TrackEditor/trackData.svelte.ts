import type { Track } from '$lib/schema/track';

export type TrackDataGlobal = {
  value: Track | undefined;
};

export const trackData = $state<TrackDataGlobal>({
  value: undefined,
});
