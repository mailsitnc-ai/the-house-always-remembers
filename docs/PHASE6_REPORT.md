# Phase 6 report: full game integration

Status: implemented and smoke-tested in the built-in browser with all audio silenced. **Not a release candidate.** Phase 7 has
not been started. No packages were added, no paid service or ElevenLabs credit was used, and no audio was generated or changed.
The three approved voice MP3s are unchanged.

## 1. Systems inspected
`StoryData`, `ChapterManager`, `EvidenceSystem`, `StoryDirector`, `RecordingPlayer`/`DialogueSystem`, `GameState`, `Game`,
`Ui`/`StoryUi`/`index.html`, `PlayerController`, the horror layer (`HorrorDirector`, `Encounters`, `Matron`, `Hollow`,
`Witness`), `Pickup`/`Readable`/`Door` props, `Upstairs`/`GroundFloor`, `AudioManager`, `Stage`-related rendering code, plus
`STORY_BIBLE.md` and `VOICE_DIRECTION.md`.

## 2. Existing systems preserved
Chapter structure and names, the 27 existing evidence items, both puzzles, the Phase 1 keypad chain, controls, journal tabs,
entity designs (the Hollow, Witness and Unremembered are unchanged), the opening, the Phase 5 cinematics, and the voice-clip
architecture. The funeral card is untouched.

## 3. New systems
| File | Purpose |
|---|---|
| `platform/SaveSystem.ts` | versioned save (v1), migration hook, unreadable saves moved aside, newer saves refused, cross-run "endings seen" |
| `story/Endings.ts` | facts, confrontation rounds, ending resolution, journal deductions (documented in `docs/ENDINGS.md`) |
| `story/Finale.ts` | generator-based scene runner: mirror, hunt hand-off, Emily's room, confrontation, three endings; skippable |
| `story/FinaleData.ts` | all new dialogue (subtitles now, audio-ready) |
| `world/Stage.ts` | an off-map "reconstructed room" with a real planar mirror, built on first use and hidden afterwards |
| `horror/Jumpscares.ts` | reusable authored scare system (location, condition, cooldown, once/repeatable, global pacing) |
| `buildReflection` | Daniel's reflection figure |
Plus UI: main menu (Continue, New Game, Settings, Credits, Clear save), pause menu (Save, Settings, Return to menu), settings
overlay, choices, end cards, credits, Deductions journal tab.

## 4. Chapter progression
| # | Chapter | Objective | Completes when |
|---|---|---|---|
| 1 | Prologue | the call | the opening ends (skippable) |
| 2 | Homecoming | read what the family left | living-room photo and kitchen note |
| 3 | The Upstairs Room | Emily's room and recorder | Emily's recorder found |
| 4 | Family Portraits | find the original prints | album print found |
| 5 | The Matron | the tape from the study | voice comparison solved (pursuit follows) |
| 6 | Eleven Years Ago | what the family packed away | Mum's letter found |
| 7 | The Missing Night | order the evening | night-order puzzle solved |
| 8 | The Last Door | the mirror, the hunt, Emily's room, the confrontation | an ending is reached |
Tested: 2 to 8 advance in order; 8 holds until an ending.

## 5-6. Evidence, journal, puzzles
Three new optional evidence items reveal the Matron's purpose (a standing-order statement, a parish letter, Mum's note about
the room). Evidence is now 30 items: 9 key, 21 optional. The journal gains a **Deductions** tab; each entry appears only when
its evidence or scene has been found. The parish letter adds an "after" timeline entry. Both puzzles are unchanged and feed the
ending facts.

## 7. Encounters and jumpscares
Four authored scares: a figure in the doorway you left, a stuttering run down a corridor, a face in a dark room, and the
Matron behind you in a lit passage. Shared 50 s gap, per-scare cooldowns, `once` where appropriate, off during encounters,
speech, the hunt and cinematics. Reduced scare intensity removes the field-of-view kick and dim. No screen shake.
The final hunt reuses the lamp-refuge pursuit: it repeats until the player reaches Emily's room.
**Not done:** the "photograph changes when you look back" scare, and a movement-while-unwatched scare.

## 8-9. Emily's preserved body
A scripted scene in a reconstructed room: a child's bed under a sheet, a hand with a faded ribbon, lavender, a teddy, a hairbrush,
a brass dish. Dim light, partial visibility, the flashlight as the only reveal, Daniel's two reaction beats, and the Matron in the
doorway. No injury is shown and nothing suggests Emily is alive. The geometry is simple primitives (a prototype); the staging
works but would benefit from a Phase 7 visual pass.

## 10. Mirror
A real planar mirror (only in the reconstructed bathroom, 512 px, only while on screen). The reflection is Daniel's own figure
(maroon top, dark messy hair), too tall, long-necked and long-armed, with lit eyes and a mouth that opens too far. It begins as a
copy, lags, then moves ahead of him, comes to the glass and breaks the scene. Verified visually.

## 11. Confrontation
Reveals her plan over three rounds with choices (see `docs/ENDINGS.md`); she says it is "a road" she has waited for, and that
what wakes "will not be Emily" (the distinction is kept). She cannot be fought. The danger is the hunt before it.

## 12. Endings
All three play to credits and are decided only by `Endings.ts`. Verified in the engine by driving each path.

## 13-14. Save, menu and flow
Autosave on a new chapter, solved puzzle, new evidence or item (debounced, never during the opening or the finale); manual
Save; Continue shows the chapter; New Game asks twice before replacing a save; Clear save asks twice; unreadable saves are set
aside, newer saves refused, and a bad saved position falls back to the foyer. Return to menu and the end of credits reload the page,
so no ending or entity state can leak. Verified: save written, reload, Continue restores chapter, evidence, flags and objective.
After an ending, Continue returns to the last checkpoint (chapter 8, after the mirror), so another ending can be played.

## 15-16. Cinematics, subtitles, accessibility
Skip (Space/Enter) works for the opening, the guided looks, and every finale scene (choices are never skipped). Settings:
master, dialogue, effects and music volume; subtitles on/off; reduced scare intensity; reduce sudden audio.

## 17. Validation
`npm run typecheck` clean; `npm run build` succeeds. Smoke tests (silent): menu, autosave, Continue, corrupt and newer saves,
ending resolution tables, mirror scene to completion, hunt hand-off, Emily's room, all three endings, credits, the post-credits
telephone, jumpscares (including reduced mode), Deductions tab, chapter 2 to 8, no console errors.
**Performance is not measured.** The embedded pane was throttled to about 1 fps during the new scenes, so frame times are not
meaningful; real-Mac behaviour of the mirror and the stage is unverified.

## 18. Known gaps and risks
- New dialogue is subtitle-only (no clips yet). It will play real clips named `<id>-<n>.m4a` once added to the manifest.
- Placeholder pitch shifting must be set to 1 for real recordings (noted in `DialogueVoices.ts`).
- The hunt and the confrontation were driven by script; they have not been hand-played. Pacing and fairness are unverified.
- Skipping the mirror or Emily's room counts them as seen for the ending facts.
- Restore does not rebuild opened doors or drawers; only taken items and puzzle effects.
- The stage uses simple geometry, and the first entry compiles new shaders (a small hitch is likely).
- Two Phase 5 behaviours were wrong and are fixed here: the Matron's mouth was scaled to about a metre when she became visible
  (found while building the reflection), and a Matron appearance now no longer shows a giant dark shape at her face.

## 19. Decisions needed from you
1. ~~Funeral card vs preserved body~~ **Resolved:** Emily was buried (confirmed canon); the Matron took her body afterwards. See `docs/PHASE6_CANON_PASS.md`.
2. ~~Ending 1 telephone line~~ **Confirmed:** the two lines are intentional variations and stay distinct.
3. **Ending meanings** for Denial and Recognition beyond what you stated are my proposal (in `docs/ENDINGS.md`).

## 20-21. Phase 7 and credits
Phase 7 has not been started. No paid services or ElevenLabs credits were used.


## 22. Final pass: Chapter 8 reworked (chase, front door, endings)
Supersedes the ending descriptions above. Canon: `STORY_BIBLE.md` sections 6, 7.1, 7.3 and 9; behaviour: `docs/ENDINGS.md`.
- The confrontation ends in a chase (objective RUN), a front-door puzzle (the false photograph and the original print), and three endings decided by what Daniel said and knew, or by reaching the door.
- The Denial ending is now a death and a possession: Daniel gives himself up, a ritual spends him, Emily's preserved body rises with the Matron in it, and the front door opens for her.
- Daniel's reflection and Emily's body were rebuilt; the Observer's "Playing recording: ..." annotation was removed (the normal game never showed identifiers).
- Verified by observation: the chase to the True Ending through the Observer's `&test=chase` route, the post-credits sequence and menu return, the Denial aftermath stages as screenshots. Unverified: audio (all muted), a human-played chase, saves mid-chase. See the final report for the list.

## 23. Final polish pass (see `docs/PHASE6_FINAL_SIGNOFF.md`)
Chase made grabbable (10-second arrow struggle, escape, per-grab clock), the true-ending puzzle guided step by step, a global subtitle safe area clear of the cinematic bars, the reflection's final stage and Emily's body reworked, the Observer bot playing the real chase, and the production bundle checked for developer code. Details, tests and limits are in the sign-off file.

Follow-up (verification and deployment): the True route was rerun on the final code and passed; chase fairness, pointer-release, save-during-grab and subtitle sizes were checked; the objective bar moved to the top-left so it never overlaps subtitles. Details: `docs/PHASE6_FINAL_SIGNOFF.md` section 14.

Second follow-up: the family photograph (a second two-children frame beside it was being opened instead), collision audit tool and a stuck-recovery key, consistency fixes. Details: `docs/PHASE6_FINAL_SIGNOFF.md` section 16.

Third follow-up: the study tape deck is now a clearly visible cassette deck with Chapter 5 objective steps, and a house map (M) was added. Details: `docs/PHASE6_FINAL_SIGNOFF.md` section 17.
