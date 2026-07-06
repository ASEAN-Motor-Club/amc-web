import type { Action } from 'svelte/action';

function resolveTarget(target: string | HTMLElement): HTMLElement {
  if (typeof target !== 'string') {
    return target;
  }
  const targetEl = document.querySelector<HTMLElement>(target);
  if (!targetEl) {
    throw new Error(`No element found matching css selector: "${target}"`);
  }
  return targetEl;
}

/**
 * Moves the element to `target` in the DOM while keeping it mounted in place
 * in the component tree. Replaces the `svelte-portal` package, which predates
 * Svelte 5 and has no Svelte 5-specific release.
 *
 * Usage: `<div use:portal={'body'}>` or `<div use:portal={someElement}>`
 */
export const portal: Action<HTMLElement, string | HTMLElement | undefined> = (
  el,
  target = 'body',
) => {
  const targetEl = resolveTarget(target);
  targetEl.appendChild(el);

  return {
    update(newTarget = 'body') {
      resolveTarget(newTarget).appendChild(el);
    },
    destroy() {
      el.remove();
    },
  };
};
