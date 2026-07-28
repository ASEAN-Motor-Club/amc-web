<script module lang="ts">
  import * as z from 'zod/mini';
  import { trackSchema } from '$lib/schema/track';

  const VIEW_PARAM = 'view';
  const VIEW_CODE = 'code';
  const VIEW_MAP = 'map';

  /**
   * JSON Schema mirror of {@link trackSchema}, for the code view's completion and inline diagnostics
   * — Monaco's json worker cannot take a zod schema. Not a second source of truth: it is derived,
   * and `trackSchema.safeParse` remains the authority on saving, since the translated messages only
   * exist there. It is stricter in one way — `additionalProperties` is `false` at every level, while
   * zod silently strips unknown keys — so that key typos surface as you type.
   *
   * The round-trip through JSON drops zod's non-enumerable `~standard` property, which holds
   * functions and cannot cross the worker's `postMessage` boundary.
   */
  const trackJsonSchema = JSON.parse(JSON.stringify(z.toJSONSchema(trackSchema))) as object;
</script>

<script lang="ts">
  import { m } from '$messages';
  import Card from '$lib/ui/Card/Card.svelte';
  import Button from '$lib/ui/Button/Button.svelte';
  import TextInput from '$lib/ui/TextInput/TextInput.svelte';
  import InputGroup from '$lib/ui/InputGroup/InputGroup.svelte';
  import Divider from '$lib/ui/Divider/Divider.svelte';
  import DownloadCard from './DownloadCard.svelte';
  import CodeEditor from '$lib/ui/CodeEditor/CodeEditor.svelte';
  import { cloneDeep, isEqual } from 'es-toolkit';
  import { WP_EULER_ORDER, fromEulerWp, toEulerWp } from '../utils';
  import { Quaternion } from 'quaternion';
  import { toRad } from '$lib/utils/math/vectors';
  import { normalizedWaypoints } from '../utils/normalized';
  import { getMsgModalContext } from '$lib/components/MsgModal/context';
  import { autoRotateAllWaypoints, autoRotateWaypoint } from '../utils/autoRotate';
  import Slider from '$lib/ui/Slider/Slider.svelte';
  import type { Track, WaypointEuler } from '$lib/schema/track';
  import EditorOlMap from '$lib/ui/EditorOlMap/EditorOlMap.svelte';
  import type { MapViewState } from '$lib/ui/OlMap/OlMap.svelte';
  import { onMount, untrack } from 'svelte';
  import type { Vector2 } from '$lib/types';
  import { beforeNavigate, goto } from '$app/navigation';
  import { page } from '$app/state';
  import { SvelteURLSearchParams } from 'svelte/reactivity';
  import { clientSearchParams, clientSearchParamsGet } from '$lib/utils/clientSearchParamsGet';

  export interface EditorProps {
    /** The track data to be edited */
    initialTrackData: Track;
  }
  const { initialTrackData }: EditorProps = $props();

  // Only one of the map and the code editor is mounted at a time, so this is unset in code view.
  let map = $state<EditorOlMap | undefined>(undefined);
  /** Where the map was looking when it unmounted, handed back so the view survives a view switch. */
  let mapView = $state<MapViewState | undefined>(undefined);

  const { showModal } = getMsgModalContext();

  // TODO: I have to move this somewhere else to avoid state_referenced_locally
  // svelte-ignore state_referenced_locally
  let trackData = $state(cloneDeep(initialTrackData));
  let selectedPointIndex = $state<number | undefined>(undefined);
  let showHidden = $state(false);

  const points = $derived(
    trackData.waypoints.map((wp) => {
      const q = new Quaternion(wp.rotation);
      return {
        coord: wp.translation,
        yaw: q.toEuler(WP_EULER_ORDER)[2],
        scaleY: wp.scale3D.y,
      };
    }),
  );

  const dirty = $derived(!isEqual(initialTrackData, trackData));

  let initialEditingPoint = $state<WaypointEuler | undefined>(undefined);
  let editingPoint = $state({
    translation: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale3D: { x: 0, y: 0, z: 0 },
  });

  // Undefined until a point has been selected, and the zeroed buffer must not count as an edit.
  const localDirty = $derived(
    initialEditingPoint !== undefined && !isEqual(initialEditingPoint, editingPoint),
  );

  /** Runs `proceed`, asking first when it would throw away uncommitted waypoint edits. */
  const confirmDiscardPointEdits = (proceed: () => void) => {
    if (!localDirty) {
      proceed();
      return;
    }
    showModal({
      title: m['track_editor.editor.discard_point_changes.title'](),
      message: m['track_editor.editor.discard_point_changes.desc'](),
      confirmText: m['track_editor.editor.discard_point_changes.confirm'](),
      cancelText: m['action.cancel'](),
      confirmAction: proceed,
    });
  };

  const selectPoint = (index: number | undefined) => {
    selectedPointIndex = index;

    if (index === undefined) {
      initialEditingPoint = undefined;
      return;
    }
    initialEditingPoint = toEulerWp(trackData.waypoints[index]);
    editingPoint = toEulerWp(trackData.waypoints[index]);
  };

  const handlePointClick = (index: number | undefined) => {
    confirmDiscardPointEdits(() => selectPoint(index));
  };

  const handleSaveChanges = () => {
    if (selectedPointIndex !== undefined) {
      trackData.waypoints[selectedPointIndex] = fromEulerWp(editingPoint);
      initialEditingPoint = cloneDeep(editingPoint);
    }
  };

  const selectedPoint = $derived(
    selectedPointIndex !== undefined
      ? {
          index: selectedPointIndex,
          yaw: toRad(editingPoint.rotation.z),
          scaleY: editingPoint.scale3D.y,
          coord: editingPoint.translation,
        }
      : undefined,
  );

  const handlePointMove = (e: Vector2) => {
    editingPoint.translation.x = e.x;
    editingPoint.translation.y = e.y;
  };

  const handleNormalize = () => {
    showModal({
      title: m['track_editor.editor.normalize_waypoints.title'](),
      message: m['track_editor.editor.normalize_waypoints.desc'](),
      confirmText: m['action.confirm'](),
      cancelText: m['action.cancel'](),
      confirmAction: () => {
        trackData.waypoints = normalizedWaypoints(trackData.waypoints);
        map?.zoomFit();
      },
    });
  };

  const handleAutoRotate = () => {
    showModal({
      title: m['track_editor.editor.auto_rotate_waypoints.title'](),
      message: m['track_editor.editor.auto_rotate_waypoints.desc'](),
      confirmText: m['action.confirm'](),
      cancelText: m['action.cancel'](),
      confirmAction: () => {
        trackData.waypoints = autoRotateAllWaypoints(trackData.waypoints);
        map?.zoomFit();
      },
    });
  };

  const handleDelete = () => {
    showModal({
      title: m['track_editor.editor.delete_waypoint.title'](),
      message: m['track_editor.editor.delete_waypoint.desc'](),
      confirmText: m['action.delete'](),
      cancelText: m['action.cancel'](),
      confirmAction: () => {
        if (selectedPointIndex !== undefined) {
          trackData.waypoints.splice(selectedPointIndex, 1);
          selectPoint(undefined);
        }
      },
    });
  };

  const handleAutoRotatePoint = () => {
    if (selectedPointIndex !== undefined) {
      editingPoint = toEulerWp(
        autoRotateWaypoint(editingPoint, selectedPointIndex, trackData.waypoints),
      );
    }
  };

  // The view is a query param written with replaceState, so switching never grows the history stack.
  const codeView = $derived(clientSearchParamsGet(VIEW_PARAM) === VIEW_CODE);

  const setView = (view: string) => {
    const params = new SvelteURLSearchParams(clientSearchParams());
    params.set(VIEW_PARAM, view);
    void goto(`?${params.toString()}`, { replaceState: true, noScroll: true });
  };

  /** The code view's own buffer, committed to `trackData` only on save. */
  let codeText = $state('');
  /** What `codeText` was seeded from, so the buffer knows whether it holds unsaved edits. */
  let codeSeed = $state('');
  const codeDirty = $derived(codeText !== codeSeed);

  const codeParsed = $derived.by(() => {
    try {
      return { ok: true as const, value: JSON.parse(codeText) as unknown };
    } catch {
      return { ok: false as const };
    }
  });

  const codeValidated = $derived(
    codeParsed.ok ? trackSchema.safeParse(codeParsed.value) : undefined,
  );

  const codeErrors = $derived.by(() => {
    if (!codeValidated) {
      return [m['track_editor.code_editor.invalid_json']()];
    }
    return codeValidated.success ? [] : codeValidated.error.issues.map((issue) => issue.message);
  });

  const seedCodeBuffer = () => {
    codeSeed = JSON.stringify(trackData, null, 2);
    codeText = codeSeed;
  };

  const handleEnterCodeView = () => {
    confirmDiscardPointEdits(() => {
      seedCodeBuffer();
      mapView = map?.getViewState();
      setView(VIEW_CODE);
    });
  };

  const handleLeaveCodeView = () => {
    if (!codeDirty) {
      setView(VIEW_MAP);
      return;
    }
    showModal({
      title: m['track_editor.code_editor.discard.title'](),
      message: m['track_editor.code_editor.discard.desc'](),
      confirmText: m['track_editor.code_editor.discard.confirm'](),
      cancelText: m['action.cancel'](),
      confirmAction: () => {
        codeText = codeSeed;
        setView(VIEW_MAP);
      },
    });
  };

  const handleCodeSave = () => {
    if (!codeValidated?.success) {
      return;
    }
    trackData = codeValidated.data;
    // Waypoints can be added or removed wholesale, which invalidates the editing buffer.
    selectPoint(undefined);
    codeSeed = codeText;
    // The saved viewport can no longer be meaningful, so the map refits when it comes back.
    mapView = undefined;
  };

  // The track only lives in memory, so leaving drops every edit that has not been downloaded.
  const unsaved = $derived(dirty || localDirty || codeDirty);

  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (unsaved) {
      event.preventDefault();
    }
  };

  let navigationConfirmed = false;

  beforeNavigate((navigation) => {
    // Full page loads (external links, tab close) are covered by handleBeforeUnload instead.
    if (navigation.willUnload) {
      return;
    }
    if (navigationConfirmed) {
      navigationConfirmed = false;
      return;
    }

    const destination = navigation.to?.url;
    if (!destination) {
      return;
    }
    // Switching view only rewrites the query string; it leaves nothing behind to guard.
    if (destination.pathname === page.url.pathname) {
      return;
    }
    if (!unsaved) {
      return;
    }
    navigation.cancel();
    showModal({
      title: m['track_editor.leave_guard.title'](),
      message: m['track_editor.leave_guard.desc'](),
      confirmText: m['track_editor.leave_guard.confirm'](),
      cancelText: m['action.cancel'](),
      confirmAction: () => {
        navigationConfirmed = true;
        // Replaying a confirmed Back with goto pushes rather than pops. Accepted: it lands on the
        // right page, and reading the delta back is not worth the history bookkeeping.
        void goto(destination);
      },
    });
  });

  // Runs on every map mount, not just the first — the map unmounts whenever code view takes over.
  $effect(() => {
    const mountedMap = map;
    if (!mountedMap) {
      return;
    }
    untrack(() => {
      // A remount that restored a saved viewport is already where the user left it.
      if (!mapView) {
        mountedMap.zoomFit();
      }
    });
  });

  onMount(() => {
    // `/track` forwards its query string on, so the page can be entered straight into code view.
    if (codeView) {
      seedCodeBuffer();
    }
  });

  let gateMode = $state(false);
  let showNum = $state(true);

  const mapBtnClass = 'text-text bg-white/80 hover:bg-white active:bg-gray-50 backdrop-blur-xs';
</script>

<div class="flex h-full w-full flex-col gap-4 p-4 md:flex-row">
  <Card class="relative flex flex-1 flex-col overflow-hidden p-0">
    {#if codeView}
      <CodeEditor
        class="min-h-0 flex-1"
        value={codeText}
        onChange={(next) => {
          codeText = next;
        }}
        schema={trackJsonSchema}
      />
      {#if codeErrors.length}
        <div
          class="text-danger-700 dark:text-danger-500 bg-danger-700/10 max-h-40 shrink-0 overflow-y-auto px-4 py-3 text-sm"
        >
          <div class="font-medium">{m['track_editor.code_editor.errors_title']()}</div>
          <ul class="list-inside list-disc">
            {#each codeErrors as error, index (index)}
              <li>{error}</li>
            {/each}
          </ul>
        </div>
      {/if}
    {:else}
      <EditorOlMap
        class="h-full"
        {points}
        onPointClick={handlePointClick}
        {selectedPoint}
        bind:this={map}
        onSelectedPointMove={handlePointMove}
        {gateMode}
        {showNum}
        initialView={mapView}
      />
      <div class="absolute bottom-4 left-4 flex gap-2">
        <Button size="sm" onClick={() => map?.zoomFit()} class={mapBtnClass}>
          {m['track_editor.editor.recenter']()}
        </Button>
        <Button size="sm" onClick={() => (gateMode = !gateMode)} class={mapBtnClass}>
          {gateMode ? m['track_editor.editor.hide_width']() : m['track_editor.editor.show_width']()}
        </Button>
        <Button size="sm" onClick={() => (showNum = !showNum)} class={mapBtnClass}>
          {showNum
            ? m['track_editor.editor.hide_number']()
            : m['track_editor.editor.show_number']()}
        </Button>
      </div>
    {/if}
  </Card>
  <div class="flex flex-row justify-between gap-4 md:w-70 md:flex-col">
    <Card class="flex flex-row gap-4 overflow-x-auto md:flex-col md:overflow-y-auto">
      {#if codeView}
        <div class="text-text-600 dark:text-text-400 font-medium">
          {m['track_editor.code_editor.editing']()}
        </div>
        <div class="flex flex-col gap-2">
          <Button disabled={!codeDirty || !codeValidated?.success} onClick={handleCodeSave}>
            {m['track_editor.editor.save_changes']()}
          </Button>
        </div>
      {:else if selectedPointIndex !== undefined}
        <div class="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div class="font-medium whitespace-nowrap">
            {m['track_editor.editor.selected_point']({
              pointNumber: selectedPointIndex + 1,
            })}
          </div>
          <Button
            onClick={() => (showHidden = !showHidden)}
            size="xs"
            variant="text"
            color="primary"
            class="-mr-1.5"
          >
            {showHidden
              ? m['track_editor.editor.fewer_settings']()
              : m['track_editor.editor.more_settings']()}
          </Button>
        </div>
        <div class="flex flex-col gap-2">
          <Button disabled={!localDirty} onClick={handleSaveChanges}
            >{m['track_editor.editor.save_changes']()}</Button
          >
          <Button onClick={handleDelete} color="danger">{m['track_editor.editor.delete']()}</Button>
        </div>
        <Divider vertical spacing={false} class="md:hidden" />
        <Divider spacing={false} class="hidden md:block" />
        <div class="flex flex-col gap-2">
          <InputGroup label={m['track_editor.editor.rotation_z']()} focusIndex={1}>
            {#snippet appendLabel()}
              <Button onClick={handleAutoRotatePoint} size="xs" variant="text" class="-mr-1.5">
                {m['track_editor.editor.auto_rotate']()}
              </Button>
            {/snippet}
            <Slider
              value={editingPoint.rotation.z}
              onChange={(value) => {
                editingPoint.rotation.z = value;
              }}
              name="rotationZ_slider"
              min={-180}
              max={180}
              size="sm"
            />
            <TextInput
              value={editingPoint.rotation.z}
              onInput={(e) => {
                editingPoint.rotation.z = +e.currentTarget.value;
              }}
              name="rotationZ"
              type="number"
              size="sm"
              additionalAttributes={{
                step: 'any',
              }}
            />
          </InputGroup>
          {#if showHidden}
            <InputGroup label={m['track_editor.editor.rotation_x']()}>
              <Slider
                value={editingPoint.rotation.x}
                onChange={(value) => {
                  editingPoint.rotation.x = value;
                }}
                name="rotationX_slider"
                min={-180}
                max={180}
                size="sm"
              />
              <TextInput
                value={editingPoint.rotation.x}
                onInput={(e) => {
                  editingPoint.rotation.x = +e.currentTarget.value;
                }}
                name="rotationX"
                type="number"
                size="sm"
                additionalAttributes={{
                  step: 'any',
                }}
              />
            </InputGroup>
            <InputGroup label={m['track_editor.editor.rotation_y']()}>
              <Slider
                value={editingPoint.rotation.y}
                onChange={(value) => {
                  editingPoint.rotation.y = value;
                }}
                name="rotationY_slider"
                min={-180}
                max={180}
                size="sm"
              />
              <TextInput
                value={editingPoint.rotation.y}
                onInput={(e) => {
                  editingPoint.rotation.y = +e.currentTarget.value;
                }}
                name="rotationY"
                type="number"
                size="sm"
                additionalAttributes={{
                  step: 'any',
                }}
              />
            </InputGroup>
          {/if}
        </div>
        <Divider vertical spacing={false} class="md:hidden" />
        <Divider spacing={false} class="hidden md:block" />
        <div class="flex flex-col gap-2">
          <InputGroup label={m['track_editor.editor.translation_x']()}>
            <TextInput
              value={editingPoint.translation.x}
              onInput={(e) => {
                editingPoint.translation.x = +e.currentTarget.value;
              }}
              name="translationX"
              type="number"
              additionalAttributes={{
                step: 'any',
              }}
            />
          </InputGroup>
          <InputGroup label={m['track_editor.editor.translation_y']()}>
            <TextInput
              value={editingPoint.translation.y}
              onInput={(e) => {
                editingPoint.translation.y = +e.currentTarget.value;
              }}
              name="translationY"
              type="number"
              additionalAttributes={{
                step: 'any',
              }}
            />
          </InputGroup>
          {#if showHidden}
            <InputGroup label={m['track_editor.editor.translation_z']()}>
              <TextInput
                value={editingPoint.translation.z}
                onInput={(e) => {
                  editingPoint.translation.z = +e.currentTarget.value;
                }}
                name="translationZ"
                type="number"
                additionalAttributes={{
                  step: 'any',
                }}
              />
            </InputGroup>
          {/if}
        </div>
        <Divider vertical spacing={false} class="md:hidden" />
        <Divider spacing={false} class="hidden md:block" />
        <div class="flex flex-col gap-2">
          <InputGroup label={m['track_editor.editor.scale_y']()}>
            <TextInput
              value={editingPoint.scale3D.y}
              onInput={(e) => {
                editingPoint.scale3D.y = +e.currentTarget.value;
              }}
              name="scaleY"
              type="number"
              additionalAttributes={{
                step: 'any',
              }}
            />
          </InputGroup>
          {#if showHidden}
            <InputGroup label={m['track_editor.editor.scale_z']()}>
              <TextInput
                value={editingPoint.scale3D.z}
                onInput={(e) => {
                  editingPoint.scale3D.z = +e.currentTarget.value;
                }}
                name="scaleZ"
                type="number"
                additionalAttributes={{
                  step: 'any',
                }}
              />
            </InputGroup>
            <InputGroup label={m['track_editor.editor.scale_x']()}>
              <TextInput
                value={editingPoint.scale3D.x}
                onInput={(e) => {
                  editingPoint.scale3D.x = +e.currentTarget.value;
                }}
                name="scaleX"
                type="number"
                additionalAttributes={{
                  step: 'any',
                }}
              />
            </InputGroup>
          {/if}
        </div>
      {:else}
        <div class="text-text-600 dark:text-text-400 font-medium">
          {m['track_editor.editor.select_point_to_edit']()}
        </div>
        <Divider vertical spacing={false} class="md:hidden" />
        <Divider spacing={false} class="hidden md:block" />
        <div class="flex flex-col gap-2">
          <div class="font-medium">
            {m['track_editor.editor.global_operations']()}
          </div>
          <Button onClick={handleNormalize}>{m['track_editor.editor.normalize']()}</Button>
          <Button onClick={handleAutoRotate}
            >{m['track_editor.editor.auto_rotate_all_gates']()}</Button
          >
        </div>
      {/if}
      <Divider vertical spacing={false} class="md:hidden" />
      <Divider spacing={false} class="hidden md:block" />
      <div class="flex flex-col gap-2">
        <div class="font-medium">
          {m['track_editor.editor.view']()}
        </div>
        {#if codeView}
          <Button onClick={handleLeaveCodeView}
            >{m['track_editor.editor.switch_to_map_view']()}</Button
          >
        {:else if selectedPointIndex !== undefined}
          <!-- Code view seeds from the track, so deselecting first keeps the buffer honest. -->
          <Button onClick={() => handlePointClick(undefined)}
            >{m['track_editor.editor.unselect']()}</Button
          >
        {:else}
          <Button onClick={handleEnterCodeView}
            >{m['track_editor.editor.switch_to_code_view']()}</Button
          >
        {/if}
      </div>
    </Card>

    <DownloadCard edited={dirty} {initialTrackData} {trackData} />
  </div>
</div>

<svelte:window onbeforeunload={handleBeforeUnload} />
