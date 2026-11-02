# Observer Mode report

Observer Mode is a **developer-only** automated demonstration of the game. It is not part of the player-facing game.
Phase 7 has not been started. No audio was generated and no voice credits were used.

## How to open it (development server only)
Start the dev server (`npm run dev`), then open one of these in the browser. `&mute` starts silent (recommended).

| Demonstration | URL |
|---|---|
| True ending | `http://localhost:5173/?observer=true&mute` |
| Recognition ending | `http://localhost:5173/?observer=recognition&mute` |
| Denial ending | `http://localhost:5173/?observer=denial&mute` |
| Continue from the observer's own last checkpoint | add `&resume` (for example `?observer=true&mute&resume`) |

Use the port the dev server prints (it may be 5174 if 5173 is taken). Wait for the loading screen to finish, then press
**Start** in the small panel at the bottom right. The normal main menu has no Observer entry and no setting enables it.

## Control panel
Pause / Resume, Restart (reloads the page), Skip scene, Next chapter (fast-forward), speed 0.5x / 1x / 2x / 4x, Annotations,
Subtitles, Audio, route selector, Exit (returns to the normal page). Pausing freezes game time, releases held keys and suspends
audio. Do not click inside the panel by accident while testing: Restart reloads the page.

## Production safety (verified offline)
- The only entry point is in `Game.ts`: `if (import.meta.env.DEV && OBSERVER) import("../dev/observer/Observer")`, where `OBSERVER`
  is `import.meta.env.DEV && ... ?observer`. In a production build `DEV` is false, so the dynamic import and everything it pulls
  in (`Observer`, `Bot`, `Pathing`, `Route`) are removed.
- Production build: `npm run build` succeeded. Scanning `dist` for "OBSERVER MODE", "Observer Mode", "__observer", "obs-pause",
  "obs-note", "thar.observer", "walkthrough", "?observer", "dev/observer", "Pathing", "failedUses", "clearVeil" and "litRoomTarget" found
  **0 matches**. The only files containing the word "observer" are Babylon's own (`onPointerObservable`, `_observer`).
- The panel and its styles are created by JavaScript inside the observer module, not in `index.html`, so no markup is shipped.

## Normal game safety (by inspection)
- `Game.ts`: every observer hook is a null check on `this.observer`, which is `null` unless the dev flag is on. The time step is
  multiplied by `1` when it is null. The pointer-lock, keypad-close and credits-reload branches change behaviour only when the
  observer exists.
- `InteractionSystem.ts`: tags and the `peek` / `pickFrom` / `meshesFor` helpers are additive. The pick predicate is the one the
  player already used (invisible furniture colliders ignored, walls kept), now shared in one function.
- Props (`Readable`, `Pickup`, `Door`, `Drawer`, `TapeDeck`, `KeypadPanel`, `Suitcase`, `Examinable`, `Decor`, `Veil`): each only passes
  an optional tag string to `register`.
- `SaveSystem.ts`: the default namespace is `thar`, giving exactly the same storage keys as before (`thar.save`,
  `thar.save.unreadable`, `thar.meta`). The observer uses `thar.observer.*`, so it cannot read, overwrite or clear a player's save.
  The observer's own save is cleared at each start (unless `&resume`).
- `HorrorDirector.ts`: `activeVeils()` and `guiding` are read-only helpers. **One intentional gameplay change**: arrival in Emily's
  room during the final hunt now ends the hunt even if the pursuit is not running (see Known issues).

## Files changed
- Created: `src/dev/observer/Observer.ts`, `Bot.ts`, `Pathing.ts`, `Route.ts`, and this report.
- Modified: `src/core/Game.ts`, `src/player/InteractionSystem.ts`, `src/platform/SaveSystem.ts`, `src/horror/HorrorDirector.ts`,
  `src/world/Decor.ts`, `src/world/props/Readable.ts`, `Pickup.ts`, `Door.ts`, `Drawer.ts`, `TapeDeck.ts`, `KeypadPanel.ts`,
  `Suitcase.ts`, `Examinable.ts`, `src/horror/Veil.ts`.

## How the automation works
It presses keys with real keyboard events (movement, E, J, F, digits, Escape) and clicks the game's own journal and tape-panel
buttons, so every interaction runs the normal code. It walks a route planned on the real collision geometry, opens doors in its
way, climbs the real staircase, aims the flashlight at the veils, plays tapes through the tape panel, types the study code on the
keypad, solves the voice comparison and the night order through the journal's buttons, and answers the final conversation with the
same keys a player would press. It sets no story flags. It does know the answer keys (the wrong lines of the voice test and the
correct order of the night) from the game's own data.

## Completed and tested (earlier browser sessions)
- **True-ending walkthrough, one complete run:** chapters 2 to 8 with no failed steps (29 evidence items, both puzzles solved through
  the journal, the mirror scene, the hunt, Emily's room, the three choices, the true ending, the credits). That run was started
  from the observer's own chapter-3 checkpoint after a page reload, not from a single uninterrupted start.
- Earlier uninterrupted runs reached chapters 6 to 8 on different attempts, which found and fixed the bugs listed below.
- Panel controls driven by script: pause (game time frozen, audio suspended), resume, all four speeds, annotation and subtitle toggles.
- Save isolation: a dummy value in the normal save key was unchanged after loading the observer page.
- `&resume` from the observer checkpoint restored chapter, evidence and position.
- Offline: typecheck and production build (below).

## Implemented but not tested
- **Denial and Recognition walkthroughs.** The routes exist. A Denial run reached chapter 8 and the mirror before exposing the
  soft-lock below. A Recognition run was never done.
- Skip scene, Next chapter, Exit, Restart, the Audio toggle (as real button clicks).
- The route selector.
- Real clicks on the panel (controls were only exercised through script).

## Known issues
- **Denial soft-lock (fix implemented, NOT re-verified).** In the Denial run the bot reached Emily's room during the final hunt but
  the hunt never ended, because arrival was only detected while the Matron's pursuit was running and the pursuit could not start
  while a recording (the Unremembered's whisper) was playing. This could also happen to a real player. The check now lives in
  `HorrorDirector.update`, independent of the pursuit. It has been typechecked and built but not run.
- The route planner reported "no grid path (walked straight)" a few times (for example toward the landing and the rear passage)
  and fell back to walking straight at the target; those steps still succeeded in the runs observed.
- The bot does not use light switches, so dark rooms are seen by flashlight only.
- Game speed 2x or more does not speed up voice recordings (they play in real time), so the opening and tapes still take real time.
- It watches the Witness and Matron briefly but does not otherwise react to being chased beyond heading for a lit room.
- The observer needs the page visible: a hidden or background pane is throttled to about one frame a second.
- Frame times were not measured. Observer cost was not profiled; it adds one path grid per storey (about 10,000 cells each).

## Remaining tests that need a browser
1. Denial walkthrough to its ending (also confirms the soft-lock fix).
2. Recognition walkthrough to its ending.
3. Skip scene, Next chapter, Restart, Exit and the Audio toggle as real clicks.
4. A visual review of the walkthrough presentation (camera smoothness, annotations, panel placement).
5. Opening the normal game without `?observer` to confirm no panel and no change.
6. Confirming the normal "Return to menu" and ending flows are unchanged, now that the arrival check was moved.
