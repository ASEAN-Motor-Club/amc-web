import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tick } from 'svelte';
import { PUBLIC_RADIO_STREAM_URL } from '$env/static/public';
import { m } from '$messages';
import RadioPage from './RadioPage.integration.svelte';

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

const findAudio = (output: Awaited<ReturnType<typeof render>>): HTMLAudioElement => {
  const audio = output.container.querySelector('audio');
  if (!(audio instanceof HTMLAudioElement)) {
    throw new Error('expected the GlobalPlayer audio element');
  }
  return audio;
};

describe('radio page', () => {
  let playSpy: ReturnType<typeof vi.spyOn>;
  let pauseSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    // Stub playback so the toggle drives DOM state without touching the real stream.
    playSpy = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    pauseSpy = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('renders the station header and page title', async () => {
    await render(RadioPage);

    // The guide card also renders an h1 from its markdown, so pin the page header by position.
    await expect
      .element(page.getByRole('heading', { level: 1 }).first())
      .toHaveTextContent(m['radio.title']());
    expect(document.title).toBe(m['radio.head']({ siteName: m.site_name_short() }));
    await expect.element(page.getByText(m['radio.station_name']())).toBeVisible();
  });

  it('starts and stops playback with the toggle', async () => {
    const output = await render(RadioPage);
    const audio = findAudio(output);

    await page.getByRole('button', { name: m['radio.play']() }).click();

    expect(playSpy).toHaveBeenCalledOnce();
    expect(audio.src).toBe(PUBLIC_RADIO_STREAM_URL);
    await expect.element(page.getByRole('button', { name: m['radio.pause']() })).toBeVisible();

    await page.getByRole('button', { name: m['radio.pause']() }).click();

    expect(pauseSpy).toHaveBeenCalledOnce();
    expect(audio.getAttribute('src')).toBeNull();
    await expect.element(page.getByRole('button', { name: m['radio.play']() })).toBeVisible();
  });

  it('keeps the waveform hidden until playback proves the stream readable', async () => {
    const output = await render(RadioPage);

    expect(output.container.querySelector('canvas')).toBeNull();

    // With playback stubbed the onplaying event never fires, so the analyser stays null.
    await page.getByRole('button', { name: m['radio.play']() }).click();

    expect(output.container.querySelector('canvas')).toBeNull();
  });

  it('restores the saved volume and persists changes to it', async () => {
    localStorage.setItem('radioVolume', '0.35');
    const output = await render(RadioPage);
    const audio = findAudio(output);
    await tick();

    expect(audio.volume).toBeCloseTo(0.35);

    const slider = page.getByRole('slider').first();
    const el = slider.element();
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(RECT);

    el.dispatchEvent(mouse('mousedown', 60));
    document.dispatchEvent(mouse('mouseup'));

    expect(Number(localStorage.getItem('radioVolume'))).toBeCloseTo(0.6);
    expect(audio.volume).toBeCloseTo(0.6);
  });
});
