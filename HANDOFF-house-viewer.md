# 3D house viewer — POC handoff

Clicking a house on the map opens `/house/<housingKey>`: the flat plot as a self-contained
diorama (the "snow globe" brief is the framing, not literal props) under an auto-orbiting camera, with the house shell and every placed piece of
furniture rendered from the game's own meshes. Verified end-to-end on `FirstHouse` (99 placed
buildings, 56 distinct models, all load).

Two worktrees, both uncommitted on their branches:

| Repo           | Worktree                                        | Branch              |
| -------------- | ----------------------------------------------- | ------------------- |
| amc-web        | `D:/Code/worktrees/amc-web/house-viewer`        | `feat/house-viewer` |
| mt-map-extract | `D:/Code/worktrees/mt-map-extract/house-server` | `feat/house-server` |

## Run it

```bash
# mt-map-extract worktree (needs resource/ — point at the main checkout's copy):
dotnet run -c Release --project house-server -- \
  --Pak D:/Code/mt-map-extract/resource/MotorTown-Windows.pak \
  --Aes D:/Code/mt-map-extract/resource/aes \
  --Usmap D:/Code/mt-map-extract/resource/Mappings.usmap
# amc-web worktree (.env has PUBLIC_HOUSE_VIEWER_API_BASE=http://localhost:5199):
pnpm dev
# open <dev url>/house/FirstHouse, or click a house on /map
```

Startup takes tens of seconds (pak mount + localization). First request fetches the world dump (~2 s); every
GLB is exported once (SmallHouse_01 ≈ 1 s, furniture tens of ms) and then served from
`out/house-server/glb-v1/`.

## What shipped

### mt-map-extract — `house-server/` (new ASP.NET project, see its README)

- `GET /api/houses/{key}` — plot (`coord`, `size`, **`yaw`**, `cost`) + owner + the world
  dump's `buildings` filtered by `housingKey`, each with a `modelUrl`.
- `GET /api/buildings/{key}/{step}.glb` — the building as GLB, glTF space, origin = actor root.
- `GET /api/ground/{color|normal}.png` — the landscape grass the plot is textured with.
- **World API cache**: `WorldCache` holds `/api/world/` in memory + `out/house-server/world.json`,
  one upstream request per 30 min max (single-flight), stale copy served if a refresh fails.
- **Model extraction**: `BuildingAssembler` resolves a `Buildings` row the way the game spawns
  it — blueprint chain (CDO subobjects, ICH overrides, SCS nodes, child actors) with the row's
  `StaticMeshes` / `ChildActorClass` overrides (`_Common_Prop`, `_Common_ChildActor` are
  generic actors that every furniture row re-skins). `GlbExporter` writes LOD0 + diffuse PNG.
- Found while doing this: out_house.json has no rotation, but plots are rotated —
  FirstHouse's House_C yaw is 96°, so its 25 m side runs along world Y. The server reads the
  yaw from the House_C root component.

### amc-web

- `src/lib/api/houseViewer.ts` — query factory for the house endpoint (`PUBLIC_HOUSE_VIEWER_API_BASE`,
  registered in `src/env.ts`, `.env.example`, and the ci/check/cd/e2e workflows; **the GitHub repo
  variable is not set yet**: `gh variable set PUBLIC_HOUSE_VIEWER_API_BASE --body '<url>'`).
- `src/lib/components/HouseViewer/`
  - `coords.ts` (+ `coords.test.ts`) — **UE → three**: position `(x, z, y) / 100` relative to the
    plot centre, `FRotator` → quaternion via UE's `FRotationMatrix` conjugated by the same axis swap.
    It is the mirror that fixes handedness and matches the GLB exporter, so models and their
    placements agree; from above, UE x is right and UE y is down, like the 2D map.
  - `scene.ts` — `WebGLRenderer` with `logarithmicDepthBuffer` (game meshes stack coplanar
    layers a few cm apart; linear depth z-fought), RoomEnvironment IBL, a shadow-casting sun placed
    exactly like the 3D map's (`motorTownSun(TIME_OF_DAY_MS)` from `#lib/ui/ThreeMap`, so changing
    that one constant relights both), plot slab (`size` × `yaw`, textured with the landscape grass
    tiled every `GROUND_TILE_M` (4 m, by eye — the landscape's tiling is baked into its material
    graph), normal map with flipped green; `polygonOffset` so house floors and parking paint win ties),
    OrbitControls with auto-rotate, starting in front of the house — along the heading of the plot's
    `MailBox_01` (one per plot, at the road; matches the plot yaw on 34/35 plots, 180° off on
    Gujwa_ContainerHouse), plot yaw if absent — one fetch per distinct GLB cloned per placement (translucent
    materials don't cast shadows, as in UE by default: parking-bay interaction boxes), full
    `dispose()`.
  - `constants.ts` — every tunable. `HouseViewer.svelte` — mounts the scene, load progress.
- `src/routes/house/[housingKey]/+page.svelte` — header titled like the map tooltip
  (`housing.owned_house` "{owner}'s House" / `housing.vacant_house`), then plot key, plot size,
  rent price (`cost / 10`, as on the map), item count, previous/next house, pause/resume rotation (dragging or zooming pauses it),
  back to map; viewer below. Reduced motion → starts paused. Previous/next links step through
  **owned** houses (`createHousingQuery`) in the housing panel's default order (owner name),
  wrapping; from a vacant plot, next = first, previous = last. Error → MsgModal, back to `/map`.
- Map: mouse left-click on a house now navigates to the viewer instead of opening the housing
  panel; the tooltip button (touch) does the same and reads "view in 3D". `rule://map` updated.
- Messages `map.click_view_3d`, `map.click_here_view_3d`, `house_viewer.*` in en/th/id.

Checks run: `pnpm check` (0 errors), eslint + prettier on touched files, `vitest --project unit`
(317 pass), map integration suite (8 pass), browser smoke of `/house/FirstHouse` and of the map
click.

Winding: the exporter keeps CUE4Parse's index order. The UE→glTF axis swap is a mirror, but it
cancels UE's opposite front-face convention; swapping corners (the first version) rendered every
mesh inside out. GLB URLs carry `?v=<ExporterVersion>` so a bump also busts browser caches.

## Known POC gaps

- Materials: base color texture × tint only (no normal/ORM). Color comes from CUE4Parse's known
  parameter names, then name heuristics (`PM_Diffuse`, `BaseColor_Tint`); a material whose color
  is computed in the parent material graph can still come out wrong. Lights' `PointLightComponent`s
  are ignored.
- Blueprint construction scripts are not executed. Handled by rule: row `MeshScale` replaces the
  component's relative scale (`_Common_Text_01` letters), and a single actor-level `StaticMesh`
  variable feeds a single mesh component (`_Deprecated_BaseDoor.DoorMesh` → `LeftDoor`). Other
  script-driven setups render their blueprint defaults.
- `/house/[housingKey]` is not in the sitemap (parameterized) and not prerendered — SPA fallback.
- The e2e/a11y suite does not cover the page; the canvas is `role="img"` with a translated label.
- No production hosting for house-server; CORS is wide open.
- The map no longer opens the housing side panel from a house click — decide if that is wanted
  beyond the POC (alternative: keep the panel and add a "View in 3D" button to it).

## Next: cut view (walls and roof sliced off, furniture visible)

The house shell is one building (`SmallHouse_01`, `rowType: "House"`), but its GLB is **not** one
mesh: the blueprint is ~39 static-mesh components (walls, pillars, roof pieces, windows, door,
satellite dish), each its own glTF node named after its mesh (`SM_TownHouse_*`, …).

Options, cheapest first:

1. **Clipping plane on the shell only** — `renderer.localClippingEnabled = true`; for meshes under
   the building whose `rowType === 'House'`, set `material.clippingPlanes = [new Plane((0,-1,0), h)]`
   with `h` ≈ 1.2–1.5 m above the floor (floor height = the shell's lowest furniture `location.z`).
   Clone the shell's materials first — GLTF clones share materials with other instances. Cut faces
   show the inside of walls: set `side: DoubleSide` on clipped materials, or draw stencil caps
   (three's `webgl_clipping_stencil` example) for solid wall tops.
   Furniture is untouched because it is separate buildings.
2. **Hide by component** — drop roof/ceiling nodes by name. Needs a per-house allow/deny list;
   brittle across house types, but gives a clean dollhouse look with no cut faces.
3. **Camera-facing cut** — clip the walls between camera and centre (plane normal = camera
   direction, updated per frame). Nice for orbiting, harder to read.

UI: a toggle next to pause/resume; animate `h` from roof height down for the reveal. Ceiling
lights (`Furniture_CeilingLight_*`) hang above the cut — clip or hide those too.

## Next: house value (land + all furniture)

- **Land**: `cost` in the response = Houses DataTable `Cost` (300,000 for FirstHouse). The site
  multiplies it by `PUBLIC_HOUSE_PRICE_MULTIPLIER` (50 in prod) and shows rent as `cost / 10`
  (FirstHouse: 1,500,000, on the map and the viewer alike). No land purchase price is shown
  anywhere — confirm what "value" should count for the plot itself.
- **Furniture**: buy price lives in the **Items** DataTable
  (`MotorTown/Content/DataAsset/Items/Items`, 566 rows): each furniture row has `Cost` and
  `BuildingKey` pointing at the Buildings row (e.g. `Furniture_Partition_04` → 500,
  `Furniture_Sofa_01A` → 1,000). Map building → item by `BuildingKey`, not by row name (they
  usually match but the link is `BuildingKey`). Some rows are `bNotForSale` or event items
  (`Easter_Rainbow`, `CC_Gold_Bar`) — decide whether they count.
- Implementation: in house-server, build `BuildingKey → Cost` once from Items and add `cost` to
  each building in the response; the page sums `land + Σ building.cost` (apply the multiplier to
  land only unless furniture prices are also server-scaled — check with the server owner) and
  shows a breakdown (land / furniture count + subtotal).
- Watch for buildings with no Items row (house shells, parking spaces may be placed by the
  housing system rather than bought) — show them as "not for sale", not as 0 silently.
