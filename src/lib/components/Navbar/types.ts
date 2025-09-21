import type { Snippet } from 'svelte';
import type { ClassValue } from 'svelte/elements';

export interface NavbarItem {
  href?: string;
  label: string;
  icon: Snippet<[boolean]>;
  exact?: boolean;
  external?: boolean;
  onMouseEnter?: () => void;
  subItems?: Omit<NavbarItem, 'subItems'>[];
  textClass?: ClassValue;
}
