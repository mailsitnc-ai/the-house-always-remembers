# Opening and entity review

Phase 7 has not been started. No story, canon, dialogue, voices, endings or eligibility rules were changed. No audio was
generated. No dependencies were added. Saves are untouched (the showcase uses its own storage name and the Observer keeps its own).
See [FIRST_TIME_WALKTHROUGH.md](FIRST_TIME_WALKTHROUGH.md) for the player-facing walkthrough.

## 1. Opening problems discovered (from the code, not guessed)
1. **Chapter 2 could not be completed from what the game said.** It needs both the photograph and Mum's note in the kitchen, but the
   objective only named the photograph. After the photograph it said "look through the rest of the ground floor", so the note
   (a small paper on a worktop) was easy to miss, and the chapter, and with it the first entity, never came.
2. **The objective was almost invisible:** 12 px, 35 % opacity, wordy ("The lights are on, and nobody should be here. Start with the...").
3. **No in-game controls prompt.** The controls were only on the main menu.
4. **No hint of where things are or how to use them** ("Walk up and press E").
5. **Nothing happens for a long time by design.** Canon puts the first entity (Witness) in Chapter 3, after the photograph *and*
   the note. A player stuck in Chapter 2 sees none, which matches the five minutes reported.
6. **The first Witness sighting could be lost.** It required low tension and, if Emily's recorder was taken before Chapter 3, it
   could never appear at all (the "first sighting must be at the recorder" rule then blocked every other spot).

## 2. Changes made
- `story/Objectives.ts`: one short imperative line plus a "where and how" line for each opening step; chapter 2 now has three
  independent steps (living room, photograph, kitchen note); chapter 3, "Find Emily's bedroom" and "Investigate the recording";
  chapter 4, "Find the original photograph". A step already done is skipped, in any order.
- `ui/StoryUi.ts`, `index.html`: the objective shows the short line always (larger and brighter); the "where and how" line shows
  when the objective changes and in the journal's Objective tab. `core/EventBus.ts` carries the new `hint` field.
- `story/StoryDirector.ts`: a controls line once the opening ends (8 s); a generic reminder that brightens the objective and hint
  again after 90 s on the same objective (repeating). The existing 35 s thought and 80 s highlight in the living room remain.
- `world/Guide.ts` (new), `core/Game.ts`: a faint warm glimmer that breathes on the thing the current objective is about
  (photograph, note, foot of the stairs, Emily's door, recorder, album). Only in the room that holds it, depth-tested (never
  through walls), fades out as you come close, not drawn for other objectives. It is not a marker or waypoint.
- `horror/HorrorDirector.ts` (Witness): the first sighting is no longer blocked by tension, and if the recorder was taken before
  Chapter 3 the first sighting moves to the next place the Witness guards. Its "after the photograph" rule is unchanged.
- Preserved: the photograph must be examined before any Witness (Chapter 3 begins only after photograph and note; random
  disturbances are still blocked until the photograph); the opening repair; the Matron is separate from the Witness.

## 3. New objective sequence
| Chapter | Step | Line | Done when |
|---|---|---|---|
| 2 | living | Go into the living room. | visited, or photo already found |
| 2 | photo | Examine the family photograph. | photograph examined |
| 2 | note | Read Mum's note in the kitchen. | note read |
| 3 | upstairs | Find Emily's bedroom. | entered |
| 3 | watcher (only if the Witness was seen) | Look at what the figure was watching. | recorder used |
| 3 | recorder | Investigate the recording. | recorder used |
| 4 | album | Find the original photograph. | album print found |
| 5-8 | chapter objective (unchanged) | | |

## 4. Entity spawn audit
| Entity | Intended first appearance | Trigger | Kind | Can fail? | Too early? |
|---|---|---|---|---|---|
| **Witness** | Ch 3, Emily's room, by the toy recorder, across the room (3.2 m or more) | Chapter 3 or later, in that room, recorder not yet taken, 20 s since the last sighting. First sighting adds a slow camera turn and a thought. | Scripted (conditional on position) | Only if the player never enters Emily's room. Fixed: tension no longer blocks the first sighting, and a recorder taken early no longer cancels it. | No: needs Ch 3, which needs the photograph and note |
| **Matron** | Ch 5, hall, foyer, living or dining room (hall encounter), later dining room | Chapter 5, 9 s after the chapter began, player on the ground floor in foyer, hall, living or dining room. Further beats: Ch 5-6 pursuit after the voice puzzle, glimpses in Ch 6-8, door in Ch 8, the hunt. | Scripted for Ch 5 to 8; the glimpse is conditional and repeatable | Cannot be skipped in practice: the foyer and hall connect every ground floor route. It waits while a recording is playing or the player is upstairs or in the study or kitchen. | No (Chapter 5 minimum) |
| **Hollow** | Ch 4 onward | Chapter 4 or later, tension 0.5 or more, player in a dark living room, dining room, kitchen, study or Daniel's bedroom, 150 s cooldown | Conditional (random in timing) | Yes, by design: a player who keeps lamps on may never meet it | No (Chapter 4 minimum). The torch or a lamp defeats it. |
| **Unremembered** | Ch 3 onward, Emily's room or landing | In Emily's room or on the landing, after the Witness has been seen and gone (or from Chapter 4), 130 s cooldown | Conditional | Only if the player never goes there | Held back until the first Witness sighting has passed |

No random encounters were added. The Witness and Matron are separate classes and separate encounters; no code shares state between them.

## 5. Encounter reliability
- **First supernatural encounter (Witness, Ch 3)**: triggers when the player walks into Emily's room in Chapter 3. Reaching that
  point now takes: photograph, note, stairs, Emily's door, each stated on screen. This is verified by reading and typechecking
  the code, not by playing it through in the browser (see section 8).
- Matron Ch 5 hall encounter: not changed, not hand-played.

## 6. Screenshots (`docs/entity-reference/`, all 1600 x 1200 PNG, captured and opened to check)
Captured by the developer-only showcase (`?showcase`, dev server only, tree-shaken out of production). It places the game's own
entity models and the finale's own chamber (the same `Stage` geometry, same camera positions as the finale) in an isolated
studio, with the same torch spotlight parameters as the player's torch and the game's tone mapping, fog and vignette. No
geometry, texture or pose was edited.

| File | Status | Shows |
|---|---|---|
| `matron-full.png` | Captured | Full body, front |
| `matron-face.png` | Captured | Face and collar |
| `matron-silhouette.png` | Captured, **not a true backlit silhouette**: a side three-quarter view against a pale backdrop showing dress, posture and outline (a fully backlit version hid her dark dress) | Clothing, posture, outline |
| `witness-full.png` | Captured | Full body with its afterimage |
| `witness-closeup.png` | Captured | Hat and coat |
| `witness-photograph.png` | Captured | The held photograph |
| `hollow-full.png` | Captured | Full silhouette |
| `hollow-closeup.png` | Captured | Head and shoulders |
| `unremembered-full.png` | Captured | Three fragments, resting pose |
| `unremembered-closeup.png` | Captured | One or two fragments close |
| `emily-body-scene.png` | Captured | The chapter-8 chamber, wide |
| `emily-body-closeup.png` | Captured | The sheet shape and hand, close |

## 7. Missing models and incomplete visual designs (honest)
- **Matron:** implemented. Very simple: a lathe dress, box-like arms and torso, a plain white mask-like face with two dark eyes, a
  nose and a thin mouth. Reads as a figure; not detailed.
- **Witness:** implemented. Coat, hat, arms, afterimage. **The "photograph" it holds is a plain grain-textured rectangle**; it carries no printed picture.
- **Hollow:** implemented as a **pure black silhouette** (head, torso, thin long arms with split fingers). No surface detail: the close-up cannot show more than shape.
- **Unremembered:** implemented as flat planes with a stripe-sliced pale cut-out. No depth. They are drawn as designed.
- **Emily's preserved body:** the finale's body is a **sheet over a shape built from four ellipsoids (head, shoulders, body, legs), with a separate small hand and a ribbon ring beside it, on a bed**. No face and no skin are shown. It is
  non-graphic as required, but it is crude and does not read as a character model. The hand and ribbon are close to floating
  on the sheet. No separate Emily character model exists in the game. I did not change or replace it.

## 8. Remaining testing requirements
- The new objective text, hints, controls line and the glimmer were **not played through in the browser**. Only typecheck and
  build were run on them. Please play the first ten minutes once: check the glimmer is subtle on the photograph, the note,
  the stairs and Emily's door, and that the hint lines are readable.
- The Witness's first sighting after these changes was not replayed.
- Hollow and Matron triggers (tension and lamp conditions) have never been hand-tested for how often they fire in real play.
- Real-Mac performance (including the added glimmer plane) is unmeasured.
- The showcase captures were rendered in the embedded browser; colour and brightness on a real display may differ.

## 9. Verification
- `npm run typecheck`: clean.
- `npm run build`: succeeds (dist 3.8 MB, same as before).
- `dist/` contains no `showcase`, `__showcase`, `entity-reference` or `__observer` strings (0 files match). The dev-only save route
  is `apply: "serve"` in `vite.config.ts`, so it is not part of any build.
- The public GitHub Pages copy was **not** updated by this work (nothing was pushed).
