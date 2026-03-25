<script lang="ts">
  import type { ClassValue } from 'svelte/elements';
  import { getInputGroupContext } from '../InputGroup/context';
  import type { Color } from '../shared';
  import { twMerge } from 'tailwind-merge';
  import clsx from 'clsx';

  export interface TextInputProps {
    /**
     * value of the input
     */
    value: number;
    /**
     * The name attribute for the input
     */
    name: string;
    /**
     * CSS class to apply to the input component
     */
    class?: ClassValue;
    /**
     * Event handler for input changes
     */
    onChange?: (value: number) => void;
    /**
     * The HTML id attribute
     */
    id?: string;
    /**
     * The color theme of the button
     * @default 'gray'
     */
    color?: Color;
    /**
     * Minimum value for the slider
     */
    min: number;
    /**
     * Maximum value for the slider
     */
    max: number;
    /**
     * Size of the slider
     * @default 'md'
     */
    size?: 'sm' | 'md';
    /**
     * CSS class to apply to the slider track
     */
    trackClass?: ClassValue;
    /**
     * CSS class to apply to the progressed portion of the slider track
     */
    progressedTrackClass?: ClassValue;
    /**
     * CSS class to apply to the slider knob
     */
    knobClass?: ClassValue;
  }

  const {
    onChange,
    value,
    name,
    class: propsClass,
    id: propsId,
    color = 'gray',
    min,
    max,
    size = 'md',
    trackClass,
    progressedTrackClass,
    knobClass,
  }: TextInputProps = $props();

  const inputGroupContext = getInputGroupContext();

  const contextId = inputGroupContext?.getId();

  const id = $derived(propsId ?? contextId ?? '');

  let valueLocal = $derived(value);
  let slider: HTMLDivElement;
  let moving = $state(false);
  let doTransition = $state(true);

  const moveSlider = (clientX: number) => {
    const rect = slider.getBoundingClientRect();
    const offsetX = clientX - rect.left;
    const percentage = offsetX / rect.width;
    const newValue = min + (max - min) * percentage;
    const newValueLocal = Math.max(min, Math.min(max, newValue));
    if (newValueLocal === valueLocal) return;
    valueLocal = newValueLocal;
    onChange?.(newValueLocal);
  };

  const getClientX = (event: MouseEvent | TouchEvent): number => {
    if (event instanceof MouseEvent) {
      return event.clientX;
    } else if (event.touches.length > 0) {
      return event.touches[0].clientX;
    }
    return 0;
  };

  const handleSliderMouseDown = (event: MouseEvent | TouchEvent) => {
    if (event instanceof MouseEvent) {
      event.preventDefault();
    }
    moving = true;
    doTransition = true;
    moveSlider(getClientX(event));
  };

  $effect(() => {
    // this cannot be in svelte:document since it cannot be passive (touchmove defaults to passive)
    const handleSliderMouseMove = (event: MouseEvent | TouchEvent) => {
      event.preventDefault();
      doTransition = false;
      moveSlider(getClientX(event));
    };

    if (moving) {
      document.addEventListener('mousemove', handleSliderMouseMove, { passive: false });
      document.addEventListener('touchmove', handleSliderMouseMove, { passive: false });
    }

    return () => {
      document.removeEventListener('mousemove', handleSliderMouseMove);
      document.removeEventListener('touchmove', handleSliderMouseMove);
    };
  });

  const handleSliderMouseUp = () => {
    moving = false;
  };

  const percent = $derived(((valueLocal - min) / (max - min)) * 100);

  const containerSizeClass = $derived.by(() => {
    switch (size) {
      case 'sm':
        return 'h-4 min-h-4';
      case 'md':
        return 'h-5 min-h-5';
      default:
        return '';
    }
  });
</script>

<svelte:document
  onmouseup={moving ? handleSliderMouseUp : undefined}
  ontouchend={moving ? handleSliderMouseUp : undefined}
/>

<div
  class={twMerge('relative flex cursor-pointer items-center', containerSizeClass, clsx(propsClass))}
  onmousedown={handleSliderMouseDown}
  ontouchstart={handleSliderMouseDown}
  bind:this={slider}
  role="slider"
  tabindex="0"
  aria-valuemin={min}
  aria-valuemax={max}
  aria-valuenow={valueLocal}
>
  <div
    class={twMerge(
      'flex w-full overflow-hidden rounded-full select-none',
      clsx([
        {
          'bg-primary-300': color === 'primary',
          'bg-danger-300': color === 'danger',
          'bg-gray-300': color === 'gray',
        },
        { 'h-1': size === 'sm', 'h-1.25': size === 'md' },
        trackClass,
      ]),
    )}
  >
    <div
      class={twMerge(
        'h-full',
        clsx([
          {
            'bg-primary-500': color === 'primary',
            'bg-danger-500': color === 'danger',
            'bg-gray-500': color === 'gray',
          },
          doTransition && 'motion-safe:transition-[width]',
          progressedTrackClass,
        ]),
      )}
      style:width={`${percent}%`}
    ></div>
  </div>
  <div
    class={twMerge(
      'absolute flex -translate-x-1/2',
      clsx([
        { 'size-3.5': size === 'sm', 'size-4.5': size === 'md' },
        doTransition && 'motion-safe:transition-[left]',
      ])
    )}
    style:left={`${percent}%`}
  >
    <div
      class={twMerge(
        'h-full w-full rounded-full shadow-md shadow-black/30 transition-colors',
        clsx([
          {
            'bg-primary-700 hover:bg-primary-500': color === 'primary',
            'bg-danger-700 hover:bg-danger-500': color === 'danger',
            'bg-gray-700 hover:bg-gray-500': color === 'gray',
          },
          knobClass,
        ])
      )}
    >
      <input class="hidden" type="range" value={valueLocal} {name} {id} />
    </div>
  </div>
</div>
