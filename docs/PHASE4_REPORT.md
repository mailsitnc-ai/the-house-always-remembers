# Phase 4 report: visual upgrade, the Matron and supernatural horror

Status: complete for review. Phases 5 to 7 have not been started. No dependencies were added.

## 1. Visual improvements (whole game)
- **Surfaces.** Normal maps are generated at load from the existing colour textures, so bump always lines up with seams, grain and stripes. Applied to floors, wallpaper, plaster (one shared map), fabric, curtains, wood, tiles, lino and doors. Floors and woods catch light with relief; wallpaper is embossed.
- **Furniture silhouettes.** A rounded-box generator (`RoundedBox.ts`) replaces hard-edged boxes on sofas, armchairs, cushions, beds, pillows, tables, cabinets, wardrobes and desks (28 parts).
- **Doors.** Six-panel doors from a panelled texture and bump map, brass rose-and-lever handles on both faces.
- **Stairs.** Rounded treads with a nosing, turned balusters, a round handrail, newel posts with caps, and a closed string along the wall.
- **Windows.** Glass now has a faint diagonal sheen; moonlight patches with the shadow of the glazing bars fall on the floor under each window.
- **Depth.** Soft contact shadows under all floor furniture, and darkening where walls meet the ceiling and floor, as cheap stand-ins for ambient occlusion.
- **Lived-in detail.** Wall sockets, radiators, shoes and slippers, cushions and a throw, a newspaper and remote, table runner, napkins and shakers, toaster, dish rack with plates, tea towel, herb pots, a bin, a coat on the study chair, a football, trainers, soft toys, soap and towels (`rooms/Details.ts`).
- **Lighting.** Lamps fade on and off instead of snapping, kitchen/bathroom/storage lights stutter on like old fluorescents, and each lit lamp has an additive halo (no post-processing). The flashlight has a 1024 px shadow map, medium PCF, a tighter cone, and can flicker or be put out.
- **Characters.** Built from lathe and tube shapes (no boxes). See below.

## 2. The Matron and the other entities
| Entity | Look | Behaviour |
|---|---|---|
| **The Matron** | 2.35 m, long dark-green dress with lace collar, belt, clasped hands, hair in a bun, pale face with two dark eye sockets and no mouth | Perfectly still unless she chooses to move. Head turns slowly to follow you; body only turns once the head cannot. Walks at one steady pace, no bob, opens doors as she passes. Speaks in a calm, even synthesised voice. |
| **The Hollow** | Stooped, long-armed, faceless smoke silhouette | Moves in sudden jumps like missing frames. Veils evidence (album, suitcase) until your flashlight clears it. Stalks in dark rooms; the beam disperses it; if it reaches you it takes your light for a few seconds and falls apart. |
| **The Witness** | Slender, pale, translucent, head bowed | Stands near key evidence you have not found, faces it, never moves or approaches. Bows and fades when you take the evidence; gone if you come close or stare. |
| **The Unremembered** | Pale cut-out child-sized figures torn into strips | Stutter in a short loop around Emily's room and the landing, with a whispered "pinky promise" loop. Not Emily. Gone if you look straight at them or come close. |

**Matron encounters (tied to the Phase 3 chapter hooks).**
- **Ch 5, the hall:** she appears at the far end, watches, speaks, and walks away.
- **Ch 5, the dining room:** she stands facing the window and speaks half-truths: "You were upstairs. You were asleep."
- **After the voice comparison, the long walk:** the house goes dark except the dining room. She walks the route to you at a steady pace and cannot enter lamplight. Switch on any lamp, or reach the dining room, and she stops, says "I am very patient", and leaves. If she reaches you, the screen whites out, you wake in the dining room with the lights back on, and your torch is dead for a few seconds. Nothing can kill you.
- **Ch 6 to 8:** an occasional glimpse behind you; a whispered request in ch 7 to leave the evening alone; in ch 8 she waits by the front door.

## 3. Horror systems
- `HorrorDirector`: tension (rises in the dark and with evidence nearby, falls in light), encounter manager with per-encounter and global cooldowns (a major scare at most every 55 s), disturbances, veils, Witness logic.
- `Encounters.ts`: every encounter is a small object (conditions, start, update, end), so adding more is easy.
- `Disturbances.ts`: lamp stutter, tread overhead, a door standing ajar, the air going cold, radio blip, the house settling.
- Coordinated scares: `HorrorDirector.scare` bundles a sound, a light event and a silence before it. Audio has a drone that rises with tension, a Matron presence hum, heartbeat, "swell / sting / drop" stingers and ducking.
- `Navigation.ts` routes figures room to room via real doorways and the stairs.
- Replaces Phase 1's `FearDirector` (its random light dips are now one disturbance among several).

## 4. Important files
New: `world/RoundedBox.ts`, `NormalMaps.ts`, `Decals.ts`, `rooms/Details.ts`, `horror/` (`CharacterBuilder`, `Entity`, `Matron`, `Hollow`, `Witness`, `Unremembered`, `Veil`, `Navigation`, `HorrorDirector`, `Encounters`, `Disturbances`).
Changed: `Materials.ts`, `Builder.ts` (rounded parts, detail LOD, contact shadows), `HouseShell.ts`, `Furniture.ts`, `props/Door.ts`, `RoomRegistry.ts`, `LightingManager.ts`, `Flashlight.ts`, `AudioManager.ts`, `Voices.ts`, `StoryData.ts` (Matron lines), `Game.ts`, `index.html`, `StoryUi.ts`.
Removed: `atmosphere/FearDirector.ts`.

## 5. Tests
All scripted, in the built-in browser, with game time stepped directly so results do not depend on the pane's frame rate.
| Test | Result |
|---|---|
| All 12 rooms reachable; stairs up and down; rails and gates block shortcuts | Pass |
| Doors, drawers, fridge, light switches, notes, photographs, pickups | Pass |
| Phase 1 keypad chain (card, keypad, study door) | Pass |
| Phase 3: all eight chapters in order, both puzzles, journal, recordings, ending card at Chapter 8 | Pass |
| Hollow veil blocks the album and the suitcase until cleared with the flashlight | Pass |
| Matron hall encounter: appears, is seen, speaks, walks away, ends | Pass |
| Matron dining, doorway, night whisper, front-door encounters start correctly | Pass |
| Pursuit starts by itself 7 s after the voice comparison; lamplight ends it; being caught moves you to the dining room and restores lights | Pass |
| Hollow stalk: flashlight disperses it; in the dark it takes your light only | Pass |
| Witness appears near key evidence and fades when it is taken | Pass |
| Unremembered fragments spawn and clear | Pass (after one fix) |
| Console errors during all of the above | None |

Bugs found and fixed during testing: window glass blown out to white; Hollow spawned too close in small rooms; fragments did not clear when looked at; torch unreachable behind the shelving collider (Phase 3); key Matron lines were being dropped when another line was playing.

## 6. Performance (honest numbers)
Measured in the app's embedded browser on the Mac Neo (A18 Pro, ANGLE/Metal, 960x540 render). That pane throttles when hidden, so these are **not** a real-play result.

| | Phase 3 | Phase 4 |
|---|---|---|
| CPU time per render call (9 views) | 0.1 to 0.8 ms | 0.2 to 1.0 ms |
| Estimated texture memory | 48 MB | 62 MB |
| JS heap | about 55-120 MB | about 120 MB |
| Meshes (total / drawn in a typical view) | 482 / n/a | 645 / 27 |
| Production build | 2.0 MB (307 kB gzip) | 2.0 MB (325 kB gzip) |
| Load, warm shader cache | about 0.8 s | about 1.2 s |
| Load, cold shader cache | 4 to 6 s | 7 to 9 s |

Short visible runs held about 60 fps with 0 to 2 hitches in about 120 frames, but GPU frame times are not trustworthy here. Please run the F4 benchmark in Chrome and Safari. The horror layer is switched off during the benchmark so runs stay comparable.

## 7. Remaining limitations
- Not heard by me: the Matron's voice, the whisper loop, stingers and the false tape. Please judge them by ear.
- The pursuit has been tested by script, not by hand with a mouse; its pace and fairness need a human playthrough.
- Cold first load is noticeably longer (more shaders pre-compiled behind the loading screen). Later loads are fast.
- Texture memory is higher (62 MB estimated). KTX2 compression would help but needs a build tool.
- Entities are lit only by the flashlight and a faint self-glow, not by room lamps, so the Matron looks the same in any room.
- The Matron glides rather than walks (the dress hides her feet); her face and hands are simple shapes, with no facial animation (Phase 5).
- Safari is untested.
