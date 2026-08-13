import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { m } from '$messages';
import PakInspectPage from './+page.svelte';

describe('pak inspect page', () => {
  const title = m['pak.inspect.head']({ siteName: m.site_name_short() });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sets the document title and og:title meta', async () => {
    await render(PakInspectPage);

    expect(document.title).toBe(title);
    const ogTitle = document.querySelector('meta[name="og:title"]');
    if (!(ogTitle instanceof HTMLMetaElement)) {
      throw new Error('expected an og:title meta tag');
    }
    expect(ogTitle.content).toBe(title);
  });

  it('renders the heading and the select-file button', async () => {
    await render(PakInspectPage);

    await expect
      .element(page.getByRole('heading', { level: 1 }))
      .toHaveTextContent(m['pak.inspect.title']());
    await expect
      .element(page.getByRole('button', { name: m['pak.inspect.select_file']() }))
      .toBeVisible();
  });

  it('keeps the hidden file input and description copy ready', async () => {
    const output = await render(PakInspectPage);

    const input = output.container.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) {
      throw new Error('expected a file input');
    }
    expect(input.accept).toBe('.pak');
    expect(input.classList.contains('hidden')).toBe(true);
    await expect.element(page.getByText(m['pak.inspect.description']())).toBeVisible();
    await expect.element(page.getByText(m['pak.inspect.privacy_note']())).toBeVisible();
  });

  it('opens the file picker when the select button is clicked', async () => {
    await render(PakInspectPage);

    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockReturnValue(undefined);
    await page.getByRole('button', { name: m['pak.inspect.select_file']() }).click();

    expect(clickSpy).toHaveBeenCalledOnce();
  });

  it('shows no result list before a file is inspected', async () => {
    const output = await render(PakInspectPage);

    expect(output.container.querySelector('ul')).toBeNull();
  });

  it('renders the repak credit link', async () => {
    await render(PakInspectPage);

    await expect.element(page.getByRole('link', { name: 'CUE4Parse' })).toBeVisible();
  });
});
