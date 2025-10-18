import { page } from '$app/state';

export function clientSearchParamsGet(key: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return page.url.searchParams.get(key);
}

export function clientSearchParams() {
  if (typeof window === 'undefined') {
    return new URLSearchParams();
  }
  return page.url.searchParams;
}
