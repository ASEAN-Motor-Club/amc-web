import { getContext, setContext } from 'svelte';

const key = {};

export type BtnIconSizeContext = {
  getSize: () => 'xs' | 'sm' | 'md' | 'lg';
};

export function setBtnIconSizeContext(context: BtnIconSizeContext) {
  setContext(key, context);
}

export function getBtnIconSizeContext() {
  const context = getContext(key);
  return context as BtnIconSizeContext | undefined;
}
