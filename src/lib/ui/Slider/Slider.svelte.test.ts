import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { tick } from 'svelte';
import Slider from './Slider.svelte';

const RECT = {
  left: 0,
  top: 0,
  right: 100,
  bottom: 10,
  width: 100,
  height: 10,
  x: 0,
  y: 0,
  toJSON: () => ({}),
} as DOMRect;

const mouse = (type: string, clientX?: number) =>
  new MouseEvent(type, { clientX, bubbles: true, cancelable: true });

describe('Slider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reflects value, min and max in its aria attributes', async () => {
    await render(Slider, { value: 50, name: 'volume', min: 0, max: 100 });
    const slider = page.getByRole('slider').first();
    await expect.element(slider).toHaveAttribute('aria-valuenow', '50');
    await expect.element(slider).toHaveAttribute('aria-valuemin', '0');
    await expect.element(slider).toHaveAttribute('aria-valuemax', '100');
  });

  it('calls onChange with the clicked position', async () => {
    const onChange = vi.fn();
    await render(Slider, { value: 0, name: 'volume', min: 0, max: 100, onChange });
    const slider = page.getByRole('slider').first();
    const el = slider.element();
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(RECT);

    el.dispatchEvent(mouse('mousedown', 50));

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith(50);
    document.dispatchEvent(mouse('mouseup'));
  });

  it('updates the value while dragging', async () => {
    const onChange = vi.fn();
    await render(Slider, { value: 0, name: 'volume', min: 0, max: 100, onChange });
    const slider = page.getByRole('slider').first();
    const el = slider.element();
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(RECT);

    el.dispatchEvent(mouse('mousedown', 25));
    expect(onChange).toHaveBeenLastCalledWith(25);

    // let the mousemove listener attach to the document
    await tick();
    document.dispatchEvent(mouse('mousemove', 75));
    expect(onChange).toHaveBeenLastCalledWith(75);

    document.dispatchEvent(mouse('mouseup'));
  });

  it('clamps values outside the min/max range', async () => {
    const onChange = vi.fn();
    await render(Slider, { value: 0, name: 'volume', min: 0, max: 100, onChange });
    const slider = page.getByRole('slider').first();
    const el = slider.element();
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(RECT);

    el.dispatchEvent(mouse('mousedown', 500));
    expect(onChange).toHaveBeenLastCalledWith(100);
    await tick();
    document.dispatchEvent(mouse('mouseup'));
    await tick();

    el.dispatchEvent(mouse('mousedown', -50));
    expect(onChange).toHaveBeenLastCalledWith(0);
    await tick();
    document.dispatchEvent(mouse('mouseup'));
  });

  it('updates aria-valuenow after a click that changes the value', async () => {
    await render(Slider, { value: 0, name: 'volume', min: 0, max: 100 });
    const slider = page.getByRole('slider').first();
    const el = slider.element();
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(RECT);

    el.dispatchEvent(mouse('mousedown', 75));
    document.dispatchEvent(mouse('mouseup'));

    await expect.element(slider).toHaveAttribute('aria-valuenow', '75');
  });
});
