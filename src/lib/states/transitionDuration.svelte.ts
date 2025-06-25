import { cssTimeToMs } from '$lib/utils/cssTransitionToMs';
import { browser } from '$app/environment';

let transitionDuration = 0;

if (browser) {
  const computedStyle = getComputedStyle(document.documentElement);
  transitionDuration = cssTimeToMs(computedStyle.getPropertyValue('--default-transition-duration'));
}

export { transitionDuration };
