import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { goto } from '$app/navigation';
import { m } from '$messages';
import { trackData } from '$lib/components/TrackEditor/trackData.svelte';
import TrackEditPage from './TrackEditPage.integration.svelte';

vi.mock('$app/navigation', () => ({ goto: vi.fn(), beforeNavigate: vi.fn() }));

const ROUTE_NAME = 'Summer Circuit';

const waypoint = (x: number) => ({
  translation: { x, y: 0, z: 0 },
  scale3D: { x: 1, y: 1, z: 1 },
  rotation: { x: 0, y: 0, z: 0, w: 1 },
});

describe('track edit page', () => {
  beforeEach(() => {
    vi.mocked(goto).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    trackData.value = undefined;
  });

  it('redirects to the track picker when no track is loaded', async () => {
    const output = await render(TrackEditPage);

    await vi.waitFor(() => {
      expect(goto).toHaveBeenCalledWith(
        expect.stringContaining('/track'),
        expect.objectContaining({ replaceState: true }),
      );
    });
    expect(document.title).toBe(m['track_editor.head']({ siteName: m.site_name_short() }));
    // The Editor (and its OpenLayers map) must not mount without a track.
    expect(output.container.querySelector('.ol-viewport')).toBeNull();
  });

  it('renders the editor with the editing title when a track is loaded', async () => {
    trackData.value = {
      routeName: ROUTE_NAME,
      waypoints: [waypoint(0), waypoint(10)],
    };

    await render(TrackEditPage);

    await expect
      .element(page.getByRole('button', { name: m['track_editor.editor.recenter']() }))
      .toBeVisible();
    await expect
      .element(page.getByText(m['track_editor.editor.global_operations']()))
      .toBeVisible();
    expect(document.title).toBe(
      m['track_editor.head_editing']({ routeName: ROUTE_NAME, siteName: m.site_name_short() }),
    );
    expect(goto).not.toHaveBeenCalled();
  });
});
