# Phase 2 report: the house, materials, lighting and core interactions

Status: complete for review. Phase 3 has not been started. No dependencies were added (still Babylon.js 9.33.1, Vite 8.3.5, TypeScript 7.0.2).

## How to run it
```bash
npm run dev          # http://127.0.0.1:5173, open in Chrome, then Safari
npm run build        # production build (dist/)
```
Controls are unchanged: WASD, Shift, mouse, E interact, F flashlight, Esc pause, F3 performance overlay.
New: **F4** (or Pause menu, "Run benchmark walk") runs a fixed 12-room walk and prints per-room frame times.

## The house
14 x 11 m, two storeys, 12 spaces. Walls are centred on grid lines and 0.2 m thick; ceilings are 2.8 m.

| Ground floor | Upstairs |
|---|---|
| Foyer (front door, study keypad) | Landing (stairwell, window) |
| Hallway (staircase, sconce, photographs) | Daniel's bedroom |
| Rear passage (back door, pantry cupboard) | Emily's bedroom |
| Living room (Phase 1 lamp, radio, clock, TV) | Bathroom |
| Dining room (table laid for dinner) | Storage room (locked) |
| Kitchen (cooker, sink, fridge, table) | |
| Study (Phase 1 puzzle room) | |

Connections: foyer-living (cased opening), foyer-hall (arch), foyer-study (locked door), hall-living and hall-dining (doors),
hall-rear (arch), rear-dining and rear-kitchen (cased openings), living-dining (arch), hall-landing (stairs),
landing-Daniel/Emily/bathroom/storage (doors). The kitchen reaches the dining room through the rear passage.

Lighting by room: warm (dining pendant, study desk lamp, foyer), dim (hall and landing sconces, Emily's night light),
dark until switched on (living, kitchen, rear passage, both bedrooms, bathroom, storage).

## Interactions (all on E, one prompt style)
Doors (open/close/locked/key), drawers (sliding, with contents), cabinet and wardrobe doors, fridge, light switches,
table lamps, radio, television, keypad, pick-ups with a small inventory, notes, photographs, children's drawings, and a teddy bear
that can be turned over in the inspection view. Two small gates: the Phase 1 card/keypad/study door, and a brass key
(kitchen drawer) for the storage room.

Content is deliberately mundane. Nothing states or implies how or where Emily's accident happened, and the Matron is not present.

## Files
**New:** `world/Layout.ts` (floor plan data), `HouseShell.ts` (walls, openings, windows, curtains, floors, stairs), `House.ts` (assembly, door specs),
`Builder.ts` (primitives and furniture frames), `Furniture.ts`, `Decor.ts`, `RoomRegistry.ts` (merging, culling, lamp containment),
`SurfaceTextures.ts`, `PaperTextures.ts`, `rooms/GroundFloor.ts`, `rooms/Upstairs.ts`, `rooms/RoomContext.ts`,
`props/Appliances.ts`, `props/LightSwitch.ts`, `props/Pickup.ts`, `props/Readable.ts`, `systems/InventorySystem.ts`, `core/Benchmark.ts`.

**Rewritten or extended:** `Materials.ts`, `WorldContext.ts`, `props/Door.ts` (any axis, hinge side, cabinets, locks, key),
`props/Drawer.ts`, `props/TableLamp.ts`, `props/KeypadPanel.ts`, `atmosphere/AudioManager.ts` (positional emitters),
`atmosphere/LightingManager.ts` (lamp culling, fog easing), `atmosphere/Flashlight.ts` (lagged beam),
`player/PlayerController.ts` (floor height, stairs), `core/Game.ts`, `core/PerfMonitor.ts`, `ui/Ui.ts`, `index.html`.

**Removed:** `world/World.ts` and `props/Radio.ts` (replaced by the above; their behaviour was kept).

## Performance design
- Static decoration is merged per room and material: 1,906 parts become about 238 meshes after merge.
- Furniture uses one invisible collider each; visual parts do not collide or pick.
- Only the current room and rooms within two links are enabled; lamps in other rooms are switched off. Each lamp's light is
  restricted to its own room's meshes, so light cannot leak through walls.
- One shadow-casting light (the flashlight, 512 px map). Everything else is unshadowed.
- Fog density varies per room and eases between them.
- All shader variants are compiled behind the loading screen, so there is no stutter the first time a room is entered.
- Rooms are all built at start rather than streamed: building takes about 200 ms here, so streaming would add complexity for no measured gain.
- Textures are procedural 256-512 px. Estimated texture memory is about 41 MB.

## Measurements (honest summary)
Taken in the app's built-in browser pane on the Mac Neo (A18 Pro, ANGLE/Metal, 960x540 render at the 75% default).
That pane throttles to about 1 fps whenever it is hidden or a long script runs, so these are **not** a performance result.

| Measured | Value |
|---|---|
| Build: materials to world built | about 190 ms |
| Cold first load (shader compile) | roughly 4 to 9 s in the pane; about 0.8 s on a repeat load |
| Short visible runs (100-150 frames) | 60 fps, p95 about 17.6 ms, 0 hitches |
| JS heap | about 55-65 MB |
| Production build | 1.9 MB total, main chunk 1.16 MB (291 kB gzipped) |

What was verified by script instead: every doorway and the stairs are walkable with the real collision system, the stair rail and level gates block
shortcuts, and all interactions above work.

**Please run the benchmark walk (F4) in Chrome and in Safari and send me the table.** That is the real measurement.

## Remaining limitations
- Performance on your Mac is unmeasured until the benchmark is run. No frame-rate claim is made.
- Safari has not been tested.
- Stairs use a smooth ramp for eye height, not individual step motion.
- Geometry is box-based: furniture is believable at a glance but has no curved or carved detail. Textures are procedural and flat (no normal maps).
- Windows show a dark sky through an emissive pane; there is no outside world and no reflections.
- No door or drawer collision physics (a drawer cannot be blocked by an object).
- Audio is synthesised; there are no footstep surface variations or voices.
- The upstairs east side of the house (beyond the landing and bathroom) is empty void.
- Texture memory is higher than it needs to be; a KTX2 compression step would roughly quarter it but needs a build tool and was not added.
- Cold-start shader compile is noticeable on first run.
