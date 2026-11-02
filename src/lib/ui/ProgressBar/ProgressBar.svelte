<script lang="ts">
  import clsx from 'clsx';
  import type { ClassValue } from 'svelte/elements';

  export interface ProgressBarProps {
    /** Filled fraction, 0..1 */
    value: number;
    /** Text drawn on the bar */
    label: string;
    /** Accessible name; defaults to {@link label} */
    ariaLabel?: string;
    /** Red fill for alert states */
    danger?: boolean;
    /**
     * `block` fills a card row; `line` is the thin pill used on the dark map overlays,
     * where the fill reads as the text colour.
     */
    variant?: 'block' | 'line';
    class?: ClassValue;
  }

  const {
    value,
    label,
    ariaLabel,
    danger = false,
    variant = 'block',
    class: propsClass,
  }: ProgressBarProps = $props();

  const percent = $derived(Math.min(100, Math.max(0, value * 100)));

  // Keep tiny-but-nonzero fills visible so "0.2%" doesn't render as an empty bar.
  const widthPercent = $derived(percent > 0 ? Math.max(percent, 2) : 0);
</script>

{#if variant === 'line'}
  <div class={clsx('flex w-full items-center gap-1.5', propsClass)}>
    <div
      class={clsx(
        'relative h-1.5 flex-1 overflow-hidden rounded-full border',
        danger ? 'border-red-400' : 'border-slate-100/70',
      )}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      aria-label={ariaLabel ?? label}
    >
      <div
        class={clsx('h-full', danger ? 'bg-red-400' : 'bg-slate-100')}
        style:width="{widthPercent}%"
      ></div>
    </div>
    <span class={clsx('text-xs font-semibold', danger ? 'text-red-400' : 'text-text-200')}>
      {label}
    </span>
  </div>
{:else}
  <div
    class={clsx(
      'relative flex h-5 w-full items-center justify-center overflow-hidden rounded-sm text-xs leading-none font-bold tabular-nums',
      danger
        ? 'bg-red-100 text-red-500 dark:bg-red-950/70 dark:text-red-500'
        : 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
      propsClass,
    )}
    role="progressbar"
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={Math.round(percent)}
    aria-label={ariaLabel ?? label}
  >
    <div
      class={clsx(
        'absolute inset-y-0 left-0',
        danger ? 'bg-red-500' : 'bg-slate-400/70 dark:bg-slate-500/60',
      )}
      style:width="{widthPercent}%"
    ></div>
    <span class="relative">{label}</span>
  </div>
{/if}
