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

  const railColorClass = $derived.by(() => {
    switch (color) {
      case 'primary':
        return 'bg-primary-300';
      case 'secondary':
        return 'bg-secondary-300';
      case 'info':
        return 'bg-info-300';
      case 'success':
        return 'bg-success-300';
      case 'warning':
        return 'bg-warning-300';
      case 'error':
        return 'bg-error-300';
      case 'neutral':
        return 'bg-neutral-300';
    }
  });

  const trackColorClass = $derived.by(() => {
    switch (color) {
      case 'primary':
        return 'bg-primary-500';
      case 'secondary':
        return 'bg-secondary-500';
      case 'info':
        return 'bg-info-500';
      case 'success':
        return 'bg-success-500';
      case 'warning':
        return 'bg-warning-500';
      case 'error':
        return 'bg-error-500';
      case 'neutral':
        return 'bg-neutral-500';
    }
  });

  const thumbColorClass = $derived.by(() => {
    switch (color) {
      case 'primary':
        return 'bg-primary-700 hover:bg-primary-800';
      case 'secondary':
        return 'bg-secondary-700 hover:bg-secondary-800';
      case 'info':
        return 'bg-info-700 hover:bg-info-800';
      case 'success':
        return 'bg-success-700 hover:bg-success-800';
      case 'warning':
        return 'bg-warning-700 hover:bg-warning-800';
      case 'error':
        return 'bg-error-700 hover:bg-error-800';
      case 'neutral':
        return 'bg-neutral-700 hover:bg-neutral-800';
    }
  });

  const sliderSizeClass = $derived.by(() => {
    switch (size) {
      case 'sm':
        return 'h-4';
      case 'md':
        return 'h-5';
    }
  });

  const railSizeClass = $derived.by(() => {
    switch (size) {
      case 'sm':
        return 'h-1';
      case 'md':
        return 'h-1.25';
    }
  });

  const thumbSizeClass = $derived.by(() => {
    switch (size) {
      case 'sm':
        return 'w-3.5 h-3.5';
      case 'md':
        return 'w-4.5 h-4.5';
    }
  });

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

  const handleSliderMouseDown = (event: MouseEvent) => {
    moving = true;
    transition = true;
    moveSlider(event.clientX);
  };

  $effect(() => {
    const handleSliderMouseMove = (event: MouseEvent) => {
      transition = false;
      moveSlider(event.clientX);
    };

    const handleSliderMouseUp = () => {
      moving = false;
    };

    if (moving) {
      document.addEventListener('mousemove', handleSliderMouseMove, { passive: true });
      document.addEventListener('mouseup', handleSliderMouseUp, { passive: true });
    }

    return () => {
      document.removeEventListener('mousemove', handleSliderMouseMove);
      document.removeEventListener('mouseup', handleSliderMouseUp);
    };
  });

  const percent = $derived(((valueLocal - min) / (max - min)) * 100);
</script>

<div
  class={['relative flex  cursor-pointer items-center', sliderSizeClass, propsClassname]}
  onmousedown={handleSliderMouseDown}
  bind:this={slider}
  role="slider"
  tabindex="0"
  aria-valuemin={min}
  aria-valuemax={max}
  aria-valuenow={valueLocal}
>
  <div
    class={['flex w-full overflow-hidden rounded-full select-none', railColorClass, railSizeClass]}
  >
    <div
      class={['h-full', trackColorClass, transition && 'transition-[width]']}
      style:width={`${percent}%`}
    ></div>
  </div>
  <div
    class={[
      'absolute -translate-x-1/2 rounded-full shadow-md/30',
      transition && 'transition-[left]',
      thumbColorClass,
      thumbSizeClass,
    ]}
    style:left={`${percent}%`}
  >
    <input class="hidden" type="range" value={valueLocal} {name} {id} />
  </div>
</div>
