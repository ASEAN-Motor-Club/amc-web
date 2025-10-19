<script lang="ts">
  import { m as msg } from '$lib/paraglide/messages';
  import Card from '$lib/ui/Card/Card.svelte';
  import Button from '$lib/ui/Button/Button.svelte';
  import TextInput from '$lib/ui/TextInput/TextInput.svelte';
  import InputGroup from '$lib/ui/InputGroup/InputGroup.svelte';
  import Divider from '$lib/ui/Divider/Divider.svelte';
  import DownloadCard from './DownloadCard.svelte';
  import { cloneDeep, isEqual } from 'lodash-es';
  import { WP_EULER_ORDER, fromEulerWp, toEulerWp } from '../utils';
  import { Quaternion } from 'quaternion';
  import { toRad } from '$lib/utils/math/vectors';
  import { normalizedWaypoints } from '../utils/normalized';
  import { getMsgModalContext } from '$lib/components/MsgModal/context';
  import { autoRotateAllWaypoints, autoRotateWaypoint } from '../utils/autoRotate';
  import Slider from '$lib/ui/Slider/Slider.svelte';
  import type { Track, WaypointEuler } from '$lib/schema/track';
  import EditorOlMap from '$lib/ui/EditorOlMap/EditorOlMap.svelte';
  import { onMount } from 'svelte';
  import type { Vector2 } from '$lib/types';

  export interface EditorProps {
    /** The track data to be edited */
    initialTrackData: Track;
  }
  const { initialTrackData }: EditorProps = $props();

  let map: EditorOlMap;

  const { showModal } = getMsgModalContext();

  let trackData = $state(cloneDeep(initialTrackData));
  let selectedPointIndex = $state<number | undefined>(undefined);
  let showHidden = $state<boolean>(false);

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
  let editingPoint = $state<WaypointEuler>({
    translation: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale3D: { x: 0, y: 0, z: 0 },
  });

  const handlePointClick = (index: number | undefined) => {
    selectedPointIndex = index;

    if (selectedPointIndex === undefined) {
      return;
    }
    initialEditingPoint = toEulerWp(trackData.waypoints[selectedPointIndex]);
    editingPoint = toEulerWp(trackData.waypoints[selectedPointIndex]);
  };

  let localDirty = $derived(!isEqual(initialEditingPoint, editingPoint));

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
      title: msg['track_editor.editor.normalize_waypoints.title'](),
      message: msg['track_editor.editor.normalize_waypoints.desc'](),
      confirmText: msg['action.confirm'](),
      cancelText: msg['action.cancel'](),
      confirmAction: () => {
        trackData.waypoints = normalizedWaypoints(trackData.waypoints);
        map.zoomFit();
      },
    });
  };

  const handleAutoRotate = () => {
    showModal({
      title: msg['track_editor.editor.auto_rotate_waypoints.title'](),
      message: msg['track_editor.editor.auto_rotate_waypoints.desc'](),
      confirmText: msg['action.confirm'](),
      cancelText: msg['action.cancel'](),
      confirmAction: () => {
        trackData.waypoints = autoRotateAllWaypoints(trackData.waypoints);
        map.zoomFit();
      },
    });
  };

  const handleDelete = () => {
    showModal({
      title: msg['track_editor.editor.delete_waypoint.title'](),
      message: msg['track_editor.editor.delete_waypoint.desc'](),
      confirmText: msg['action.delete'](),
      cancelText: msg['action.cancel'](),
      confirmAction: () => {
        if (selectedPointIndex !== undefined) {
          trackData.waypoints.splice(selectedPointIndex, 1);
          selectedPointIndex = undefined;
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

  onMount(() => {
    map.zoomFit();
  });

  let gateMode = $state<boolean>(false);
  let showNum = $state<boolean>(true);

  const mapBtnClass =
    ' text-text bg-white/80 hover:bg-white active:bg-neutral-100 backdrop-blur-lg';
</script>

<div class="flex h-full w-full flex-col gap-4 p-4 md:flex-row">
  <Card class="relative flex-1 overflow-hidden p-0">
    <EditorOlMap
      class="h-full"
      {points}
      onPointClick={handlePointClick}
      {selectedPoint}
      bind:this={map}
      onSelectedPointMove={handlePointMove}
      zoomClass="!left-[unset] !top-[unset] bottom-4 right-4"
      {gateMode}
      {showNum}
    />
    <div class="absolute bottom-4 left-4 flex gap-2">
      <Button size="sm" onClick={() => map.zoomFit()} class={mapBtnClass}>
        {msg['track_editor.editor.recenter']()}
      </Button>
      <Button size="sm" onClick={() => (gateMode = !gateMode)} class={mapBtnClass}>
        {gateMode
          ? msg['track_editor.editor.hide_width']()
          : msg['track_editor.editor.show_width']()}
      </Button>
      <Button size="sm" onClick={() => (showNum = !showNum)} class={mapBtnClass}>
        {showNum
          ? msg['track_editor.editor.hide_number']()
          : msg['track_editor.editor.show_number']()}
      </Button>
    </div>
  </Card>
  <div class="md:w-70 flex flex-row justify-between gap-4 md:flex-col">
    <Card class="flex flex-row gap-4 overflow-x-auto md:flex-col md:overflow-y-auto">
      {#if selectedPointIndex !== undefined}
        <div class="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div class="whitespace-nowrap font-medium">
            {msg['track_editor.editor.selected_point']({
              pointNumber: selectedPointIndex + 1,
            })}
          </div>
          <Button
            onClick={() => (showHidden = !showHidden)}
            size="xs"
            variant="text"
            color="info"
            class="-mr-1.5"
          >
            {showHidden
              ? msg['track_editor.editor.hide_more']()
              : msg['track_editor.editor.show_more']()}
          </Button>
        </div>
        <div class="flex flex-col gap-2">
          <Button disabled={!localDirty} onClick={handleSaveChanges}
            >{msg['track_editor.editor.save_changes']()}</Button
          >
          <Button onClick={handleDelete} color="error">{msg['track_editor.editor.delete']()}</Button
          >
        </div>
        <Divider vertical spacing={false} class="md:hidden" />
        <Divider spacing={false} class="hidden md:block" />
        <div class="flex flex-col gap-2">
          <InputGroup label={msg['track_editor.editor.rotation_z']()} focusIndex={1}>
            {#snippet appendLabel()}
              <Button
                onClick={handleAutoRotatePoint}
                size="xs"
                variant="text"
                color="success"
                class="-mr-1.5"
              >
                {msg['track_editor.editor.auto_rotate']()}
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
            <InputGroup label={msg['track_editor.editor.rotation_x']()}>
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
            <InputGroup label={msg['track_editor.editor.rotation_y']()}>
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
          <InputGroup label={msg['track_editor.editor.translation_x']()}>
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
          <InputGroup label={msg['track_editor.editor.translation_y']()}>
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
            <InputGroup label={msg['track_editor.editor.translation_z']()}>
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
          <InputGroup label={msg['track_editor.editor.scale_y']()}>
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
            <InputGroup label={msg['track_editor.editor.scale_z']()}>
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
            <InputGroup label={msg['track_editor.editor.scale_x']()}>
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
        <div class="text-text/60 dark:text-text-dark/60 font-medium">
          {msg['track_editor.editor.select_point_to_edit']()}
        </div>
        <Divider vertical spacing={false} class="md:hidden" />
        <Divider spacing={false} class="hidden md:block" />
        <div class="flex flex-col gap-2">
          <div class="font-medium">
            {msg['track_editor.editor.global_operations']()}
          </div>
          <Button onClick={handleNormalize}>{msg['track_editor.editor.normalize']()}</Button>
          <Button onClick={handleAutoRotate}
            >{msg['track_editor.editor.auto_rotate_all_gates']()}</Button
          >
        </div>
      {/if}
    </Card>

    <DownloadCard edited={dirty} {initialTrackData} {trackData} />
  </div>
</div>
