import type { Track } from '#lib/schema/track.js';

export interface TrackDataGlobal {
  value: Track | undefined;
}

export const trackData = $state<TrackDataGlobal>({
  value: undefined,
});
