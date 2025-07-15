<script lang="ts">
  import type { ClassValue } from 'svelte/elements';
  import { getInputGroupContext } from '../InputGroup/context';
  import type { Color } from '../shared';

  export type TextInputProps = {
    /**
     * The value of the input
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
     * @default 'neutral'
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
  };

  const {
    onChange,
    value,
    name,
    class: propsClassname,
    id: propsId,
    color = 'neutral',
    min,
    max,
    size = 'md',
  }: TextInputProps = $props();

  const inputGroupContext = getInputGroupContext();

  const contextId = inputGroupContext?.getId();

  const id = $derived(propsId ?? contextId ?? '');

  let valueLocal = $derived(value);
  let slider: HTMLDivElement;
  let moving = $state(false);
  let transition = $state(true);

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
    } else if (event.touches && event.touches.length > 0) {
      return event.touches[0].clientX;
    }
    return 0;
  };

  const handleSliderMouseDown = (event: MouseEvent | TouchEvent) => {
    if (!(event instanceof TouchEvent)) {
      event.preventDefault();
    }
    moving = true;
    transition = true;
    moveSlider(getClientX(event));
  };

  $effect(() => {
    // this cannot be in svelte:document since it cannot be passive (touchmove defaults to passive)
    const handleSliderMouseMove = (event: MouseEvent | TouchEvent) => {
      event.preventDefault();
      transition = false;
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
</script>

<svelte:document
  onmouseup={moving ? handleSliderMouseUp : undefined}
  ontouchend={moving ? handleSliderMouseUp : undefined}
/>

<div
  class={[
    'relative  flex cursor-pointer items-center',
    { 'h-4': size === 'sm', 'h-5': size === 'md' },
    propsClassname,
  ]}
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
    class={[
      'flex w-full select-none overflow-hidden rounded-full',
      {
        'bg-primary-300': color === 'primary',
        'bg-secondary-300': color === 'secondary',
        'bg-info-300': color === 'info',
        'bg-success-300': color === 'success',
        'bg-warning-300': color === 'warning',
        'bg-error-300': color === 'error',
        'bg-neutral-300': color === 'neutral',
      },
      { 'h-1': size === 'sm', 'h-1.25': size === 'md' },
    ]}
  >
    <div
      class={[
        'h-full',
        {
          'bg-primary-500': color === 'primary',
          'bg-secondary-500': color === 'secondary',
          'bg-info-500': color === 'info',
          'bg-success-500': color === 'success',
          'bg-warning-500': color === 'warning',
          'bg-error-500': color === 'error',
          'bg-neutral-500': color === 'neutral',
        },
        transition && 'transition-[width]',
      ]}
      style:width={`${percent}%`}
    ></div>
  </div>
  <div
    class={[
      'absolute flex -translate-x-1/2',
      { 'h-3.5 w-3.5': size === 'sm', 'w-4.5 h-4.5': size === 'md' },
      transition && 'transition-[left]',
    ]}
    style:left={`${percent}%`}
  >
    <div
      class={[
        'shadow-md shadow-black/30 h-full w-full rounded-full transition-colors',
        {
          'bg-primary-700 hover:bg-primary-800': color === 'primary',
          'bg-secondary-700 hover:bg-secondary-800': color === 'secondary',
          'bg-info-700 hover:bg-info-800': color === 'info',
          'bg-success-700 hover:bg-success-800': color === 'success',
          'bg-warning-700 hover:bg-warning-800': color === 'warning',
          'bg-error-700 hover:bg-error-800': color === 'error',
          'bg-neutral-700 hover:bg-neutral-800': color === 'neutral',
        },
      ]}
    >
      <input class="hidden" type="range" value={valueLocal} {name} {id} />
    </div>
  </div>
</div>
