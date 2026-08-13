import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { m } from '$messages';
import PakConflictPage from './+page.svelte';

describe('pak conflict page', () => {
  const title = m['pak.conflict.head']({ siteName: m.site_name_short() });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sets the document title and og:title meta', async () => {
    await render(PakConflictPage);

    expect(document.title).toBe(title);
    const ogTitle = document.querySelector('meta[name="og:title"]');
    if (!(ogTitle instanceof HTMLMetaElement)) {
      throw new Error('expected an og:title meta tag');
    }
    expect(ogTitle.content).toBe(title);
  });

  it('renders the heading, folder button and description copy', async () => {
    await render(PakConflictPage);

    await expect
      .element(page.getByRole('heading', { level: 1 }))
      .toHaveTextContent(m['pak.conflict.title']());
    await expect
      .element(page.getByRole('button', { name: m['pak.conflict.select_folder']() }))
      .toBeVisible();
    await expect.element(page.getByText(m['pak.conflict.description']())).toBeVisible();
    await expect.element(page.getByText(m['pak.conflict.privacy_note']())).toBeVisible();
  });

  it('keeps the folder input hidden and multi-select', async () => {
    const output = await render(PakConflictPage);

    const input = output.container.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) {
      throw new Error('expected a file input');
    }
    expect(input.hasAttribute('webkitdirectory')).toBe(true);
    expect(input.multiple).toBe(true);
    expect(input.classList.contains('hidden')).toBe(true);
  });

  it('opens the folder picker when the select button is clicked', async () => {
    await render(PakConflictPage);

    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockReturnValue(undefined);
    await page.getByRole('button', { name: m['pak.conflict.select_folder']() }).click();

    expect(clickSpy).toHaveBeenCalledOnce();
  });

  it('reports when the selected folder has no mod pak files', async () => {
    const output = await render(PakConflictPage);

    const input = output.container.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) {
      throw new Error('expected a file input');
    }
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(new File(['dummy'], 'Readme.txt', { type: 'text/plain' }));
    dataTransfer.items.add(
      new File(['dummy'], 'AssetPack.pak', { type: 'application/octet-stream' }),
    );
    input.files = dataTransfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));

    await expect.element(page.getByText(m['pak.conflict.no_pak_files']())).toBeVisible();
    await expect
      .element(page.getByRole('button', { name: m['pak.conflict.select_folder']() }))
      .toBeEnabled();
  });

  it('shows no results before a folder is scanned', async () => {
    const output = await render(PakConflictPage);

    expect(output.container.querySelector('ul')).toBeNull();
  });

  it('renders the repak credit link', async () => {
    await render(PakConflictPage);

    await expect.element(page.getByRole('link', { name: 'CUE4Parse' })).toBeVisible();
  });
});
