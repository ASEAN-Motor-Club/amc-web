import { getContext, setContext } from 'svelte';

const key = {};

export interface SelectContext<T> {
  readonly onSelect: (id: T) => void;
  readonly addOption: (id: T, value: string) => void;
  readonly getOption: (id: T) => string;
}

export function setSelectContext<T>(context: SelectContext<T>) {
  setContext(key, context);
}

export function getSelectContext<T>() {
  const context = getContext(key);
  return context as SelectContext<T>;
}
