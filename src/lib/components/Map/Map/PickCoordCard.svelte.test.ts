import { render } from 'vitest-browser-svelte';
import { describe, expect, it, vi } from 'vitest';
import { tick } from 'svelte';
import PickCoordCard from './PickCoordCard.svelte';
import { m } from '#messages';

const clickButton = async (base: HTMLElement, label: string) => {
  const button = base.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  if (!button) throw new Error(`no button labelled ${label}`);
  button.click();
  await tick();
};

describe('PickCoordCard', () => {
  it('renders the picked game coordinate rounded', async () => {
    const output = await render(PickCoordCard, {
      coord: { x: -445_547.4, y: 938_125.6 },
      onClear: vi.fn(),
    });

    expect(output.baseElement.textContent).toContain('X -445547, Y 938126');
  });

  it('copies the coordinate pair', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    const output = await render(PickCoordCard, {
      coord: { x: 12.2, y: -34.7 },
      onClear: vi.fn(),
    });

    await clickButton(output.baseElement, m['a11y.copy_coordinates']());

    expect(writeText).toHaveBeenCalledWith('12, -35');
  });

  it('drops the pointer through onClear', async () => {
    const onClear = vi.fn();
    const output = await render(PickCoordCard, { coord: { x: 1, y: 2 }, onClear });

    await clickButton(output.baseElement, m['a11y.clear']());

    expect(onClear).toHaveBeenCalledOnce();
  });
});
