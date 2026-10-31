import { page } from '$app/state';

export function clientSearchParamsGet(key: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return page.url.searchParams.get(key);
}

// `page.url` is readonly in SvelteKit 3; callers copy this string into their own mutable params.
export function clientSearchParams(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  return page.url.searchParams.toString();
}
