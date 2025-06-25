<script lang="ts">
  import { m } from '$lib/paraglide/messages.js';
  import MtMap, {
    type PointClickEventDetail,
    type PointMoveEventDetail,
    type PointsGroups,
  } from '$lib/ui/MtMap/MtMap.svelte';
  import type { TrackData, WaypointEuler } from '../types';
  import mapImage from '$lib/assets/map.png';
  import roadImage from '$lib/assets/road.svg';
  import Card from '$lib/ui/Card/Card.svelte';
  import Button from '$lib/ui/Button/Button.svelte';
  import TextInput from '$lib/ui/TextInput/TextInput.svelte';
  import InputGroup from '$lib/ui/InputGroup/InputGroup.svelte';
  import DownloadCard from './DownloadCard.svelte';
  import { cloneDeep, isEqual } from 'lodash-es';
  import { WP_EULER_ORDER, fromEulerWp, toEulerWp } from '$lib/utils/waypoint';
  import { Quaternion } from 'quaternion';
  import { toRad } from '$lib/utils/math/vectors';
  import { normalizedWaypoints } from '$lib/utils/waypoint/normalized';
  import { getMsgModalContext } from '$lib/components/MsgModal/context';
  import { autoRotateAllWaypoints, autoRotateWaypoint } from '$lib/utils/waypoint/autoRotate';
  import Slider from '$lib/ui/Slider/Slider.svelte';

  export type EditorProps = {
    /** The track data to be edited */
    initialTrackData: TrackData;
  };
  let { initialTrackData }: EditorProps = $props();

  const { showModal } = getMsgModalContext();

  let zoomFit = $state<boolean>(true);
  let trackData = $state(cloneDeep(initialTrackData));
  let selectedPointIndex = $state<number | undefined>(undefined);
  let showHidden = $state<boolean>(false);

  const trackGroup = $derived.by(() => {
    const computedStyle = getComputedStyle(document.documentElement);
    return {
      t: {
        points: trackData.waypoints.map((wp) => {
          const q = new Quaternion(wp.rotation);
          return {
            position: wp.translation,
            yaw: q.toEuler(WP_EULER_ORDER)[2],
            scaleY: wp.scale3D.y,
          };
        }),
        trackMode: true,
        draggable: true,
        color: {
          point: computedStyle.getPropertyValue('--color-primary-600'),
          hover: computedStyle.getPropertyValue('--color-primary-400'),
          selected: computedStyle.getPropertyValue('--color-cyan-600'),
          arrowColor: computedStyle.getPropertyValue('--color-red-700'),
          gate: computedStyle.getPropertyValue('--color-yellow-600'),
          gateHover: computedStyle.getPropertyValue('--color-yellow-400'),
          gateSelected: computedStyle.getPropertyValue('--color-cyan-600'),
          outline: computedStyle.getPropertyValue('--color-neutral-800'),
        },
      },
    } satisfies PointsGroups;
  });

  const dirty = $derived(!isEqual(initialTrackData, trackData));

  let initialEditingPoint = $state<WaypointEuler | undefined>(undefined);
  let editingPoint = $state<WaypointEuler>({
    translation: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale3D: { x: 0, y: 0, z: 0 },
  });

  const handlePointClick = (e: PointClickEventDetail) => {
    selectedPointIndex = e.index;

    if (selectedPointIndex === undefined) {
      return;
    }
    initialEditingPoint = toEulerWp(trackData.waypoints[selectedPointIndex]);
    editingPoint = toEulerWp(trackData.waypoints[selectedPointIndex]);
  };

  let localDirty = $derived(!isEqual(initialEditingPoint, editingPoint));

  const handleSaveChanges = () => {
    zoomFit = false;
    if (selectedPointIndex !== undefined) {
      trackData.waypoints[selectedPointIndex] = fromEulerWp(editingPoint);
      initialEditingPoint = cloneDeep(editingPoint);
    }
  };

  const selectedPointYaw = $derived(toRad(editingPoint.rotation.z));

  const selectedPointsScaleY = $derived(editingPoint.scale3D.y);

  const selectedPointsPosition = $derived(editingPoint.translation);

  const handlePointMove = (e: PointMoveEventDetail) => {
    editingPoint.translation.x = e.position.x;
    editingPoint.translation.y = e.position.y;
  };

  const handleNormalize = () => {
    showModal({
      title: m['track_editor.editor.normalize_waypoints.title'](),
      message: m['track_editor.editor.normalize_waypoints.desc'](),
      confirmText: m['action.confirm'](),
      cancelText: m['action.cancel'](),
      confirmAction: () => {
        zoomFit = true;
        trackData.waypoints = normalizedWaypoints(trackData.waypoints);
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
        zoomFit = true;
        trackData.waypoints = autoRotateAllWaypoints(trackData.waypoints);
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
</script>

<div class="flex h-full w-full flex-col gap-4 p-4 md:flex-row">
  <Card class="flex-1 overflow-hidden !p-0">
    <MtMap
      class="h-full"
      groups={trackGroup}
      {zoomFit}
      {mapImage}
      {roadImage}
      onPointClick={handlePointClick}
      onPointMove={handlePointMove}
      selectedPointId="t"
      {selectedPointIndex}
      {selectedPointYaw}
      {selectedPointsScaleY}
      {selectedPointsPosition}
    />
  </Card>
  <div class="flex flex-row justify-between gap-4 md:w-70 md:flex-col">
    <Card class="flex flex-row gap-4 overflow-x-auto md:flex-col md:overflow-y-auto">
      {#if selectedPointIndex !== undefined}
        <div class="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div class="font-medium whitespace-nowrap">
            {m['track_editor.editor.selecting_point']({ pointNumber: selectedPointIndex + 1 })}
          </div>
          <Button
            onClick={() => (showHidden = !showHidden)}
            size="xs"
            variant="text"
            unPadded
            color="info"
          >
            {showHidden ? m['track_editor.editor.hide']() : m['track_editor.editor.show']()}
            {m['track_editor.editor.hidden']()}
          </Button>
        </div>
        <div class="flex flex-col gap-2">
          <Button disabled={!localDirty} onClick={handleSaveChanges}
            >{m['track_editor.editor.save_changes']()}</Button
          >
          <Button onClick={handleDelete} color="error">{m['track_editor.editor.delete']()}</Button>
        </div>
        <div class="border-l-1 border-gray-500/50 md:border-t-1"></div>
        <div class="flex flex-col gap-2">
          <InputGroup label={m['track_editor.editor.rotation_z']()} focusIndex={1}>
            {#snippet appendLabel()}
              <Button
                onClick={handleAutoRotatePoint}
                size="xs"
                variant="text"
                unPadded
                color="success"
              >
                {m['track_editor.editor.auto_rotate']()}
              </Button>
            {/snippet}
            <Slider
              value={editingPoint?.rotation.z}
              onChange={(value) => (editingPoint.rotation.z = value)}
              name="rotationZ_slider"
              min={-180}
              max={180}
              size="sm"
            />
            <TextInput
              value={editingPoint?.rotation.z}
              onInput={(e) => (editingPoint.rotation.z = +e.currentTarget.value)}
              name="rotationZ"
              type="number"
              step="any"
              size="sm"
            />
          </InputGroup>
          {#if showHidden}
            <InputGroup label={m['track_editor.editor.rotation_x']()}>
              <Slider
                value={editingPoint?.rotation.x}
                onChange={(value) => (editingPoint.rotation.x = value)}
                name="rotationX_slider"
                min={-180}
                max={180}
                size="sm"
              />
              <TextInput
                value={editingPoint?.rotation.x}
                onInput={(e) => (editingPoint.rotation.x = +e.currentTarget.value)}
                name="rotationX"
                type="number"
                step="any"
                size="sm"
              />
            </InputGroup>
            <InputGroup label={m['track_editor.editor.rotation_y']()}>
              <Slider
                value={editingPoint?.rotation.y}
                onChange={(value) => (editingPoint.rotation.y = value)}
                name="rotationY_slider"
                min={-180}
                max={180}
                size="sm"
              />
              <TextInput
                value={editingPoint?.rotation.y}
                onInput={(e) => (editingPoint.rotation.y = +e.currentTarget.value)}
                name="rotationY"
                type="number"
                step="any"
                size="sm"
              />
            </InputGroup>
          {/if}
        </div>
        <div class="border-l-1 border-gray-500/50 md:border-t-1"></div>
        <div class="flex flex-col gap-2">
          <InputGroup label={m['track_editor.editor.translation_x']()}>
            <TextInput
              value={editingPoint?.translation.x}
              onInput={(e) => (editingPoint.translation.x = +e.currentTarget.value)}
              name="translationX"
              type="number"
              step="any"
            />
          </InputGroup>
          <InputGroup label={m['track_editor.editor.translation_y']()}>
            <TextInput
              value={editingPoint?.translation.y}
              onInput={(e) => (editingPoint.translation.y = +e.currentTarget.value)}
              name="translationY"
              type="number"
              step="any"
            />
          </InputGroup>
          {#if showHidden}
            <InputGroup label={m['track_editor.editor.translation_z']()}>
              <TextInput
                value={editingPoint?.translation.z}
                onInput={(e) => (editingPoint.translation.z = +e.currentTarget.value)}
                name="translationZ"
                type="number"
                step="any"
              />
            </InputGroup>
          {/if}
        </div>
        <div class="border-l-1 border-gray-500/50 md:border-t-1"></div>
        <div class="flex flex-col gap-2">
          <InputGroup label={m['track_editor.editor.scale_y']()}>
            <TextInput
              value={editingPoint?.scale3D.y}
              onInput={(e) => (editingPoint.scale3D.y = +e.currentTarget.value)}
              name="scaleY"
              type="number"
              step="any"
            />
          </InputGroup>
          {#if showHidden}
            <InputGroup label={m['track_editor.editor.scale_z']()}>
              <TextInput
                value={editingPoint?.scale3D.z}
                onInput={(e) => (editingPoint.scale3D.z = +e.currentTarget.value)}
                name="scaleZ"
                type="number"
                step="any"
              />
            </InputGroup>
            <InputGroup label={m['track_editor.editor.scale_x']()}>
              <TextInput
                value={editingPoint?.scale3D.x}
                onInput={(e) => (editingPoint.scale3D.x = +e.currentTarget.value)}
                name="scaleX"
                type="number"
                step="any"
              />
            </InputGroup>
          {/if}
        </div>
      {:else}
        <div class="text-text/60 dark:text-text-dark/60 font-medium">
          {m['track_editor.editor.select_point_to_edit']()}
        </div>
        <div class="border-l-1 border-gray-500/50 md:border-t-1"></div>
        <div class="flex flex-col gap-2">
          <div class="font-medium">{m['track_editor.editor.global_operations']()}</div>
          <Button onClick={handleNormalize}>{m['track_editor.editor.normalize']()}</Button>
          <Button onClick={handleAutoRotate}
            >{m['track_editor.editor.auto_rotate_all_gates']()}</Button
          >
        </div>
      {/if}
    </Card>

    <DownloadCard edited={dirty} {initialTrackData} {trackData} />
  </div>
</div>
