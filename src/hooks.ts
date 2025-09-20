// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { deLocalizeUrl } from '$lib/paraglide/runtime';

export const reroute = (request) => deLocalizeUrl(request.url).pathname;
