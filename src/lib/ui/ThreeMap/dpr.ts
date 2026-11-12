/**
 * Calls `onChange` whenever the window's devicePixelRatio changes - browser zoom, or dragging
 * the window to another monitor. ResizeObserver does not fire for either when the CSS size
 * stays put, but every DPR-baked canvas (dots, labels, the drawing buffer) must be rebuilt.
 * Returns a stop function.
 */
export function watchDevicePixelRatio(onChange: () => void): () => void {
  let query: MediaQueryList | undefined;
  const arm = (): void => {
    query = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    query.addEventListener('change', onQueryChange, { once: true });
  };
  function onQueryChange(): void {
    onChange();
    // The query describes one fixed ratio: re-arm against the new one.
    arm();
  }
  arm();
  return () => query?.removeEventListener('change', onQueryChange);
}

/**
 * Calls `onChange` whenever a web font finishes loading. Label canvases are rasterised once, so text
 * drawn before its font arrived (a CJK/Thai subset is fetched on first use, and canvas text alone does
 * not always trigger it) must be drawn again. Returns a stop function.
 */
export function watchFontLoads(onChange: () => void): () => void {
  document.fonts.addEventListener('loadingdone', onChange);
  return () => document.fonts.removeEventListener('loadingdone', onChange);
}
