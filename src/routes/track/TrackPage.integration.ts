import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { goto } from '$app/navigation';
import { m } from '$messages';
import { trackData } from '$lib/components/TrackEditor/trackData.svelte';
import TrackPage from './TrackPage.integration.svelte';

vi.mock('$app/navigation', () => ({ goto: vi.fn(), beforeNavigate: vi.fn() }));

const waypoint = (x: number) => ({
  translation: { x, y: 0, z: 0 },
  scale3D: { x: 1, y: 1, z: 1 },
  rotation: { x: 0, y: 0, z: 0, w: 1 },
});

const VALID_TRACK = {
  routeName: 'Test Route',
  waypoints: [waypoint(0), waypoint(10)],
};

const pasteTrackFile = (content: string) => {
  const transfer = new DataTransfer();
  transfer.items.add(new File([content], 'track.json', { type: 'application/json' }));
  document.dispatchEvent(
    new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true, cancelable: true }),
  );
};

describe('track page', () => {
  beforeEach(() => {
    vi.mocked(goto).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    trackData.value = undefined;
  });

  it('renders the track picker header and page title', async () => {
    await render(TrackPage);

    await expect
      .element(page.getByRole('heading', { level: 1 }))
      .toHaveTextContent(m['track_editor.title']());
    expect(document.title).toBe(m['track_editor.head']({ siteName: m.site_name_short() }));
    await expect.element(page.getByText(m['track_editor.select_track.drag_drop']())).toBeVisible();
    await expect
      .element(
        page.getByRole('button', { name: m['track_editor.select_track.load_from_clipboard']() }),
      )
      .toBeVisible();
    await expect
      .element(page.getByRole('button', { name: m['track_editor.select_track.select_file']() }))
      .toBeVisible();
  });

  it('loads a valid pasted track and navigates to the editor', async () => {
    await render(TrackPage);

    pasteTrackFile(JSON.stringify(VALID_TRACK));

    await vi.waitFor(() => {
      expect(goto).toHaveBeenCalledWith(expect.stringContaining('/track/edit'));
    });
    expect(trackData.value?.routeName).toBe(VALID_TRACK.routeName);
  });

  it('shows the error modal for invalid pasted data', async () => {
    await render(TrackPage);

    pasteTrackFile('not a track');

    await expect
      .element(page.getByRole('heading', { name: m['track_editor.select_track.error.title']() }))
      .toBeVisible();
    await expect
      .element(page.getByText(m['track_editor.select_track.error.load_error']()))
      .toBeVisible();
  });
});
