import type { Track } from '#lib/schema/track.ts';

export interface TrackDataGlobal {
  value: Track | undefined;
}

export const trackData = $state<TrackDataGlobal>({
  value: undefined,
});
