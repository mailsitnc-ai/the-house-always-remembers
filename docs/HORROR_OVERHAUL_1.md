# Horror Overhaul 1 — the Matron, the lesser entities, authored scares

Status: implemented, **uncommitted**. Not pushed. Phase 7 not started.
Evidence labels used below: **[source]** read from code, **[logic]** state read back from the running game while stepping the director by hand, **[frame]** a rendered frame of the real scene (saved in `docs/horror-overhaul-1/`), **[run]** an automated run. Nothing here was *listened to*, and no real Mac / A18 Pro timing was measured.

## 1. Why the house was not frightening (audit, [source] + [logic])

| Finding | Detail |
|---|---|
| Too rare | Big moments needed a 55 s gap, jumpscares had 260–320 s cooldowns and a 50 s global gap, tension was cut by 0.5 after every encounter and fell fast in any lit room. Small disturbances needed the living-room photograph and fired at most 40 % per 25 s. In a normal session the player could go minutes with nothing. |
| Too gentle | Every encounter was one note: a figure appears, a sting plays, she fades. The jumpscare "punch" was a 0.1 rad field-of-view nudge. |
| The Matron was absent | Chapter 5 had her hall / living-room / pursuit encounters. Chapters 6–8 had one rare doorway glimpse (tension ≥ 0.45, 160 s cooldown) and one radio voice. The villain of the middle and late game was mostly missing. |
| Lesser entities were decoration | Hollow only stalked in dark rooms; Witness only stood shyly by evidence; Unremembered only appeared in Emily's room / landing. |
| Placement was unvalidated | Figures were placed at "far points" with no check for floor, furniture, line of sight or the camera. `seenBy` had no line-of-sight test. |
| Audio was flat | Every sound came from the listener, not from a place in the house. |

## 2. What changed

New files: `src/horror/MatronScares.ts`, `src/horror/LesserEntities.ts`, `src/horror/Staging.ts`, `src/horror/BathroomMirror.ts`.
Edited: `HorrorDirector.ts`, `Disturbances.ts`, `Jumpscares.ts`, `Entity.ts`, `AudioManager.ts`, `world/props/Door.ts`.
No story, evidence, puzzle, dialogue, ending or save-format change. The existing encounters (`Encounters.ts`) and the chase/struggle are untouched.

Foundations
* **Staging** — every authored figure goes through it: standing point on the floor of a real room, not on the stairs, 0.4 m clear of solids at knee and chest height, a clear ray from the player's eye to the head, never closer than 1.7 m. `validate()` (dev) checks the rule over every standing point of both floors: 585 of 988 points accepted, the rest are furniture/wall margins. [logic]
* **Spatial audio** — `playAt/stepAt/breathAt/scrapeAt/musicBoxAt`: the sound is panned left/right of where the player faces and softer with distance, through the same effects volume and "reduce sudden audio" scaling as every other sound.
* **Key light** — a cool point light that lights *only* the Matron's meshes, so she reads in a dark passage and does not light the house.
* **Door.swingTo / isAjar / doorwayPoint** — a door can be left ajar by an authored scare.

## 3. The Matron (calm, patient, in control)

She is the same figure with the same canon (she does not enter lamplight; she does not speak new lines). Chapters 6–8 only, so she is not introduced early.

| # | Encounter | What the player sees and hears | Observed |
|---|---|---|---|
| A | **The Turn** (`matron-turn`) | Three slow steps behind him, each nearer, then breath close behind. If he turns she is 2.7 m away, facing him, hands folded; 1.5 s to read her, then the sting and she is gone. If he never turns, only the dread. | [frame] `A-the-turn.jpg` |
| B | **The Door Gap** (`matron-doorgap`) | From inside a room, a closed door is left ajar and a figure stands in the passage, seen through the gap at the latch side. When he comes within 2 m (or touches the door) it swings wide, she is in the doorway, a short sting, gone. | [frame] `B-door-gap-setup.jpg`, `B-door-gap-payoff.jpg` |
| C | **The Reflection** (`matron-mirror`) | In the bathroom, looking at the mirror, a real reflection pane (MirrorTexture, enabled only during the scare) shows her standing behind him. When he turns the room is empty and the glass still shows it. If he keeps looking she is suddenly at his shoulder, in the glass only. | [frame] `C-reflection-in-mirror.jpg`, `C-reflection-turned-empty.jpg` |
| D | **The Follower** (`matron-follower`) | A far figure. Each time he moves or turns the lights stutter and in the dark she has moved a third of the way nearer (6.8 → 4.5 → 3.0 → 2.4 m), and on the last stutter she is gone. | [frame] `D-follower-2-nearer.jpg` (`D-follower-3-closest.jpg` is the dark moment) |
| E | **The Safe Room** (`matron-safe`) | In a *lit* room, the clock stops and the room goes silent, the lamp stutters once and she is standing in the cased opening just outside the light. She does not cross it; she steps back into the dark. (Chapter 7+.) | [frame] `E-safe-room.jpg` |
| — | **Stalking** (`matron-watch`) | She watches from the far end of the corridor and is gone when he looks away; when he looks back she is nearer (7 → 4.3 → 3.0 m). | [frame] `watch-far-corridor.jpg` |
| F | **The Last Look** (`matron-lastlook`, once, Chapter 8 hunt, on the landing) | She stands in the way ahead, calm; the lights stutter; she is a few steps nearer, and gone. She never blocks the way for more than a moment, never touches him here, and nothing about Emily's door is touched. | [frame] `F-last-look-nearer.jpg` |

**Reactive:** from Chapter 6 `provoke()` raises the tension and removes the wait when Daniel finds evidence, finishes a recording, or enters Emily's room, so something follows soon (still bound by each encounter's own conditions and cooldowns).
**Environmental:** doors left ajar and thrown wide (B), the lights (D, F), room sound and the clock (E), doors closing / lamps going out in the room just left, furniture sounds, a music box from Emily's room (section 6). None of them alters a critical puzzle state or removes evidence; lamps return after 9 s, doors can be reopened.

## 4. Lesser entities

| Entity | Role now | Behaviour |
|---|---|---|
| **Hollow** — denial | Active, from Chapter 4 | `hollow-denial`: in a room that still holds evidence he has not found, it stands at the evidence's place, in the way of his view, with a dry static burst; it steps toward him in jumps (up to three, 0.7 m each) and dissolves if he walks within 2.2 m, lights it for 1.4 s, or 16 s pass. It is a figure, not a collider: it never blocks a path. `hollow-glimpse` (Chapter 5+): far down a passage, gone after he looks at it for 0.9 s. [frame] `hollow-denial-study.jpg`; the glimpse was verified only as visible state, **not** seen in a captured frame (a dark figure in a dark passage). |
| **Witness** — silent guide | Unchanged look and behaviour | Amber, hat, photograph, cyan afterimage, near evidence, gone when approached. Added: the first time it is properly noticed, a shutter click and a short blink of the light (skipped under reduced intensity). |
| **Unremembered** — the failing memory | Own identity: pale cut-out fragments, a loop of jerky steps, a music-box detune | `unremembered-wrong` (Chapter 4+, in an uncertain-memory room that is not Emily's room or the landing): up to three fragments in view, the air thickens and the field of view "swims" by about 3.5 % for at least 6 s (not under reduced intensity; never the controls or movement); they go when looked at. [frame] `unremembered-study.jpg` (a faint fragment at the left edge). |

## 5. Chapter escalation

Ch 1–2 unchanged (no new events). Ch 3 Witness + small house events. Ch 4 Hollow denial, Unremembered, the photographs. Ch 5 the existing Matron encounters plus Hollow glimpse. Ch 6 Matron stalking, A–D, event gap 14 s and tension rises faster in the dark, big-moment gap 40 s. Ch 7 adds E; gap 32 s. Ch 8 gap 24 s, plus F in the hunt. Jumpscares' global gap is ×0.65 from Chapter 6.

## 6. The house feels alive (`Disturbances.ts`)

Existing: lamp stutter, door ajar, cold, radio blip, settle. Reworked/new: **upstairs-steps** (placed steps crossing the landing above or hall below), **door-behind** (the door of the room he just left closes), **lights-behind** (that room's lamp goes out for 9 s), **chair-drag** (scrape from another room), **emily-box** (music box from Emily's room). Not the same event twice in a row; none during the hunt or while someone is speaking; gap 38 / 24 / 14 s by chapter.

## 7. Audio identity

Matron: heavy low tread (`stepAt`) and slow breath (`breathAt`), placed. Hollow: broken-signal static (`hollowStatic`). Witness: the shutter. Unremembered: two sliding notes (`unstable`). House: scrape, music box, placed steps. Silence is used (the clock stops in E, a duck before each reveal). All existing/procedural; no ElevenLabs voice or credit used.

## 8. Accessibility and fairness

* Reduced scare intensity: no field-of-view punch, no light dips/flickers (new `h.dim / h.flick`), no swim; sounds are scaled. Verified for scare A: field of view unchanged with `reduced` on. [logic]
* "Reduce sudden audio" / master / effects volumes: all new sounds go through the existing effects bus and intensity scaling. **Not listened to.**
* No scare blocks progression: every encounter ends on its own (timeout, leaving the room, looking, approaching), no figure is a collider, the doors only swing toward open or shut and are never locked, F never touches Emily's door, and nothing hurts or removes the player's control.

## 9. Tests

| Test | Result |
|---|---|
| `tsc --noEmit` | clean |
| Endings branching tests (`__debug.endingTests()`), includes the Q2 fix | **25 / 25** [run] |
| True ending, Observer, bounded visible-state run (`?demo&timer&ending=true`) | played through hunt → confrontation → chase → photographs → credits → menu, no page errors [run]. The director is off in that route, so it exercised no new encounter; it shows the finale is unharmed. |
| Each new encounter forced in the real scene and stepped by hand | A, B, C, D, E, F, watch, Hollow denial, Unremembered all start, behave as in section 3/4 and end cleanly [logic]; frames in `docs/horror-overhaul-1/` |
| Natural scheduling, 200 s of simulated play per chapter (director stepped, player moved between rooms) | Chapter 6: doorgap, hollow-glimpse, emily-memory; Chapter 7: matron-turn, emily-memory. (3 and 2 big moments per 200 s with 10-second room visits; real play stays in rooms longer.) |
| Production build | `vite build` OK; no `__debug`, Observer, CollisionAudit or EndingsTest in `dist`. [source] |
| Save/load | `done`/`lastEnd` snapshot still serialises; **no full save-and-reload round trip was run for this task.** |

**Performance (honest):** in this embedded browser the director's `update` averaged 0.03–0.1 ms, `canStart` of all 18 encounters ≈ 2 ms every 2 s, one placement test 0.1–0.7 ms. First appearance of an entity or the key light caused a one-off 36–75 ms hitch in this browser. Frame rate in the hidden pane is meaningless and **no real A18 Pro measurement was made.** New runtime cost is: one extra point light that affects only the Matron's meshes, a mirror render target (256², only for ~6 s, otherwise disabled), no new post-process, no particles.

## 10. Remaining problems / not done

* Door-gap (B) only works from inside a room whose door opens onto a passage (the hall is too narrow to see the doors from outside).
* Hollow glimpse and the Unremembered fragment are low-contrast in dark rooms; the Hollow glimpse was not captured in a frame.
* Mirror scare: the room is rendered unlit in the reflection (only the figure is lit); it reads as a dark figure in the glass.
* The Witness got only the shutter flash and its existing guiding; no new guiding behaviour.
* No real-audio listening test, no real-device performance test, no organic (hand-played) walkthrough of Chapters 6–8 with the new scares in the loop.
* `Staging.validate()` is dev tooling but is not tree-shaken out of production; it is a small, unused method.

---

# Horror Overhaul 1.1 and 1.2 — repairs and validation

Evidence labels: **[source]** code inspection · **[tsc]** typechecked · **[test]** automated (25 ending tests) · **[natural]** seen in a normal Observer session (nothing forced) · **[forced]** seen only when the encounter was started by hand · **[not tested]**.
Nothing here was listened to (no audio output was available to the author), and no real Mac measurement was made.

## 1.1 changes (committed in 1bd1667)
Door gap works from the landing and from inside rooms (waits until she has been seen through the gap); mirror reflection dim, cold and blurred, only where the cramped bathroom allows it; Hollow rim-lit, irregular hop / sidestep / head-snap movement with placed static; Witness guide choreography (idle → turn → show the photograph → turn back and point; flash when the clue is found or looked at); entity materials capped at two lights and shaders prepared early; audio chain reordered so master and effects volume really scale loud sounds; spatial sounds keep their direction when scheduled; steps, breath, shutter and scrape raised; one-shot pulse fix.

## 1.2 changes (uncommitted)
* **Fair scheduling** (`HorrorDirector.chooseEncounter`): never-played and long-unplayed encounters are favoured, the one that just played is penalised, priority still counts; no encounter is forced. Turn and Safe Room dwell thresholds loosened. [source][tsc]
* **Hollow ghoul** (`hollow-ghoul`, Ch5+, dark rooms, tension ≥ 0.35, cooldown 330 s): the Hollow is seen still and far off; when looked at, the lights stutter and it closes in three jumps with static to 1.6 m, then breaks up. It cannot touch; a flashlight beam ends it; reduced intensity: it only creeps nearer. [forced]
* **Unremembered**: fragment model levels are built one per room entry in the background. [source][tsc]
* **Emily's reveal** (`Finale.chamberScene`): before anything is shown the room is nearly dark and quiet, Daniel's breath is the loudest sound, the lamp rises unevenly over ~4 s, a long held look at the sheet-covered shape precedes the move toward the head, and a ~5 s pause follows the hand with the ribbon. No new dialogue, no new story. [natural]
* **Denial transfer** (`Finale.denialScene`): unless reduced scare intensity is on, the former black cut is now six short flashes between darkness (the Matron looming; her hands at his chest; the wound; his face; the dark thread leaving; a red flood), then the unchanged aftermath. Reduced intensity keeps the original unseen version. No dialogue or events changed. [natural, Denial route]

## Verification results
| Item | Result |
|---|---|
| Typecheck | clean [tsc] |
| 25 ending tests | 25 / 25 [test] |
| Production build | builds; no `__debug`, Observer, collision-audit or ending-test code in it [source] |
| Observer session Ch1→8 at 4× (single bounded run, no forcing) | **natural:** Turn (Ch6, Ch7), Unremembered fragments (Ch6, storage), Last Look (Ch8, landing, during the hunt), Witness at Emily's recorder (Ch3) and at the album (Ch4) each through idle → turn → show → back; also the existing pursuit, night, doorway and door encounters; disturbances: overhead steps, door-ajar ×2, lights-behind, emily-box, door-behind. **not seen naturally:** Door Gap, Reflection, Follower, Safe Room, Hollow denial, Hollow ghoul, Hollow glimpse, Watch (they were seen only in forced tests). |
| Witness targets | all six Witness spots point at a real interactable within 0.04 m (recorder deck, album print, family photograph, kitchen note, answering machine, suitcase) [source/measured in the live scene]; Ch3 and Ch4 guiding seen naturally |
| Emily reveal, continuous capture in the Observer's Ch8 chamber (200 frames, 5 per second, `reveal-continuous-*.jpg`) | darkness and the lamp coming up, the sheet-covered figure framed from the foot of the bed, then the full bed with the ribbon on the wrist visible as a small lavender band [natural]. Not a video file (no ffmpeg). Player control: the scene is the existing locked cinematic; not tested with a human player. |
| Denial transfer in normal progression (`transfer-continuous-*.jpg`) | plays: the Matron looming, red flash, black, then the aftermath, no page errors [natural]. Some flash framings are rough (one shows only his legs and the red wash), so the camera positions of flashes 2–5 want tuning. |
| Recognition ending | completed to the menu, no errors (earlier 1.2 run, isolated slot) [natural] |
| Performance (embedded browser, hidden pane, noisy: base render 2–8 ms) | Hollow first appearance 14.5 ms vs 0.8 ms afterwards (was ~20–38 ms); Unremembered: first `force` call 29.7 ms, first render 4.7 ms, afterwards a spawn costs 1–4.5 ms (cause of the first 29.7 ms not isolated); Emily chamber: first frame 20.5 ms, then median 0.7 ms, max 0.9 ms; chamber lights: flashlight + 3 room lamps + stage lamp + figure light, one shadow generator (the flashlight), 0 post-processes, 49 active meshes. |
| Audio | not listened to; level measurements from 1.1 stand |

## Known issues
Door Gap, Reflection, Follower, Safe Room, Hollow denial, Hollow ghoul and Hollow glimpse have never been seen in a natural Observer run (the bot moves too quickly through rooms for their dwell conditions); the Unremembered first-call cost is unexplained; transfer flash framings 2–5 are rough; no audio listening; no real-device timing; the screenshot folder holds ~240 exact duplicate files (see the cleanup report in the chat).

## 1.2 final polish and cleanup
* **Transfer camera polish** (`Finale.denialScene`): the five flash framings are now measured from where Daniel lies (chest at `CX+0.34, CZ+1.23`) and where the Matron kneels beside him (`CX+0.73, CZ+1.17`): (1) low from his feet with her silhouette over him, (2) above his chest with his body in the pool and her dress across the frame, (3) close on the wound and her arm, (4) his face from the side away from her, (5) the dark threads arching to the bed with her standing over it; then the red flood and black, into the unchanged aftermath. Observed in a normal Denial run (`polished-transfer-*.jpg`, `polish-tf1..5.jpg`).
* **Reduced scare intensity**: a Denial run with the setting on completed to `ending:done` and emitted no red-flood veil (0, against 1 in the normal run), i.e. the original unseen transfer is kept. Observed in a normal Denial run.
* **Regression**: typecheck clean; 25 / 25 ending tests (includes the Question 2 fix); production build contains no `__debug`, Observer, collision-audit, showcase or ending-test code.
* **Screenshot cleanup** (`docs/horror-overhaul-1-1/`): 175 exact-content duplicates removed (69 `denial-stage-*`, 75 `chamber-clip-*`, 9 `reveal-clip-*`, 22 `transfer-continuous-*`), each with an identical retained file. The remaining unique `chamber-clip-*`, `reveal-clip-*` and `denial-run-*` frames were kept because they are not duplicates.
* **Limitations kept**: audio has not been verified by ear; Door Gap, Reflection, Follower, Safe Room, Hollow denial, Hollow ghoul, Hollow glimpse and Watch were observed only in forced tests, not natural gameplay; performance figures were taken with the preview pane hidden and are approximate.
