import { getContext, setContext } from 'svelte';

const key = {};

export type InputGroupContext = {
  readonly label: string;
  getId: () => string;
};

export function setInputGroupContext(context: InputGroupContext) {
  setContext(key, context);
}

export function getInputGroupContext() {
  const context = getContext(key);
  return context as InputGroupContext | undefined;
}
