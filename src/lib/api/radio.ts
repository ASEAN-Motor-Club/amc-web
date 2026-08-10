import { PUBLIC_RADIO_STREAM_URL } from '$env/static/public';

export const getStreamUrl = (): string => {
  const url = new URL(PUBLIC_RADIO_STREAM_URL);
  url.searchParams.set('t', String(Date.now()));
  return url.toString();
};
