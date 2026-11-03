# Full story demo report

The existing Observer Mode was extended, not rebuilt. Phase 7 has not been started. No character, model, texture, animation or environment was
changed or generated; no audio was generated; nothing was installed. Typecheck is clean, the production build succeeds, and `dist/` contains none of the
Observer or showcase code.

## How to launch it
Start the dev server (`npm run dev`), then open:

**`http://localhost:5173/?demo`** (use the port the server prints), wait for the loading screen, and press **Play**.

Nothing starts until you press Play, so nothing can scare you on opening. It starts **muted**, with **subtitles on**, **annotations on** and at **1x**.
Extra flags: `&audio` (start with sound), `&timer` (drive the frame loop from a timer: use it if the page is in a background tab or an embedded pane, where the browser slows
animation to 1 to 2 frames per second), `&resume` (continue from the demo's own checkpoint). `?observer=true` still works and is the same thing; `?observer=recognition` and
`?observer=denial` select the other endings.

**Panel (bottom right):** Pause / Resume, Restart (reloads, which starts the walkthrough over), Skip scene, Next chapter, speed 0.5x / 1x / 2x / 4x, Annotations, Subtitles, Audio, route, Exit.
**New on-screen display (top left):** the chapter number and title, the current objective, and a progress bar (chapters 1 to 8, then the ending). The annotations now also say why each
chapter matters and explain the Matron's chamber and transformation, using only facts the game itself establishes.

## What was run (one real route, the True Ending)
The route was started from the opening and ran at 4x (muted) until the chamber, where it was set to 1x so the finale played at its real pace. In the browser's own page, with the demo's own save slot.
Chapters reached: 1 (the telephone call) at 16 s, then 2 at 41 s, 3 at 82 s, 4 at 103 s, 5 at 161 s, 6 at 190 s, 7 at 227 s, 8 at 282 s (all wall-clock seconds at 4x).
**The True Ending was reached and the credits were shown** (in the first correction round; see below for what has changed since) (`ending:true`, `ending:done`, credits visible), with all 29 evidence items found by the game's own mechanics, the voice test and the night order
solved through the journal, and the final choices answered as refuse, own, refuse.

The chapter contents below come from the route's design and the chapter objectives; during the run I observed the chapter changes, objectives, evidence count and the finale frames, but I did not watch every scene (the Witness, Hollow and Unremembered encounters in particular were not individually confirmed).

| Chapter | What the demonstration shows |
|---|---|
| 1 The telephone | The call that brings Daniel back after eleven years. |
| 2 Homecoming | Return to the house, the living room, the family photograph, first disturbance (footsteps upstairs). |
| 3 The upstairs room | Upstairs, Emily's bedroom, her belongings and recordings. |
| 4 Family portraits | The photographs and prints that disagree; the Witness; the original photograph. |
| 5 The Matron | The study, the tape in Emily's voice, the voice comparison solved in the journal, the Matron's manipulation. |
| 6 Eleven years ago | What the family packed away and why the house was kept; the Hollow and the Unremembered appear through the chapters. |
| 7 The missing night | The timeline of the night, assembled in the journal. |
| 8 The last door | The mirror scene, the hunt, Emily's room and her preserved body, the Matron's true form and confrontation, the True Ending, credits. |

## The Matron's transformation, in the real finale
Shown in real time, from the actual player camera, lit by the actual player flashlight, in the real confrontation room: frames at 3-second steps are in `docs/full-story-demo/`
(`demo-t00.png` to `demo-t21.png`, `demo-finale-transformation-sheet.png`, `demo-choices.png`). They were captured while the run played, not posed. The clock ran from 0.1 s to 21.0 s.
The head stays connected to the neck throughout; the hair grows, lifts and settles; the head tilts and turns while the torso is still; the neck and body stretch and the eyes go black.
**The choices appeared at 21.0 s, after the transformation finished**, and nothing was shown before. I looked at the frames; the last frame (T21) shows the black eyes; I did not judge the mouth expression at this small size.

**Three real bugs found and fixed on the way** (all in the real game, not just the demo):
1. **The Matron was invisible in the real finale.** The finale takes the controls and switches the horror director off, and the director is what fades her in, so she stood at 0% opacity in an empty doorway. Fixed with a small `HorrorDirector.stageUpdate` called from the finale's own update.
2. **She would have stayed in her "unmasked" form.** The story-derived level also was not following the story during the finale, so the true form was never reached in the real game. The same call fixes it (observed: the level rose from 2.0 to 3.0 in the chamber, the sequence ran).
3. **The confrontation would have been unlit** (found last time): Daniel now turns to face her.

## Status after the final reliability and canon pass

### Tested and working
- **Rapid skipping cannot interrupt or bypass the transformation (focused test).** The chamber scene was entered and Space and Enter were pressed every 250 ms (152 presses, plus the 1 key as a choice
  attempt every fourth press). The transformation ran uninterrupted from 0 to 21.0 s (logged each second, 9.2, 10.2, 11.2, ... 20.2, 21.0), the Matron stayed fully visible, the choices were **held the whole time**
  (`hold=true`, none shown, the 1 presses ignored) and were released only when the sequence finished at 21.0 s. No choice was visible before it finished. The test entered chapter 8 with the game's own save-restore call
  and the real `finale:arrived` event rather than by playing the chapters, so it tests the transformation and the gate, not the route.
- **The gate was strengthened by this test's reasoning:** it is now decided by the story (the chamber scene is on, the Matron is on screen and the 21-second sequence has not finished), not by her animation level.
  Before, a scene skipped through at once could reach the choice before her level had risen to the point where the sequence starts. The skipped-scene test above ran on the new version.
- **The True Ending's post-credit scene is present and works.** My earlier report said it was missing. That was wrong: I had only searched the finale script. It is in `StoryUi.showCredits` and `index.html`:
  after the credits, for the True Ending only, the roll is replaced by the line "(The telephone rings in the empty house. No one speaks.)", the old telephone rings twice (the existing `audio.ring`, no new audio), and after 7 s the credits close.
  Tested by showing the credits for the true ending and ending them with Space: the roll was hidden, the line appeared, the ring was called once, and the credits closed after 7.5 s. **Nothing was changed** in this scene, and the Denial ending's telephone scene is untouched.
  (The natural 42-second credit roll leads to the same code.) In Observer Mode the page stays on the empty screen after the 7 s instead of reloading, as before.
- **Demo controls, as button clicks on the real page:**
  - Play: started, display shown, game running. Defaults: muted, subtitles on, annotations on, 1x.
  - Pause: game time and Daniel's position frozen (zero change over 2.5 s), the button became Resume, the audio context was suspended. Resume: running again, audio context running.
  - 1x, 2x and 4x: measured at 1.0, 2.0 and 4.0 simulated seconds per second.
  - Subtitles: shown with the toggle on, suppressed with it off, shown again after. Annotations: opacity 1, then 0, then 1.
  - Audio: toggles between the master volume 0.8 and 0, and the button state follows.
  - Restart: the page reloaded, the walkthrough was back at the Play button with no running state. The normal save area was unchanged (a marker value stayed intact and the normal save key stayed empty throughout all tests).
- **Normal game unchanged without the flags:** the normal page loads with no panel, display or observer object. Typecheck is clean and the production build succeeds; `dist/` contains none of the Observer, showcase or timer code.

### Fixed but not fully tested
- **The finale-transition hang.** Cause (found by reading and by the first full run): `Bot.follow`, the walking loop, waited for the controls to come back whenever a scene had taken them, and nothing ever ended that wait, so
  when the finale began while Daniel was still walking to Emily's room the walk never returned and the answers to the choices were never reached. Fix: a walk ends as soon as a finale scene takes the controls.
  **Focused test:** the game was put in chapter 8, a long walk to the upper floor was started, and the finale was started 3 s in. The walk returned (true) **6.4 s later (at 4x speed)** instead of never; it was not
  instant, because the level change underneath it finishes first. I did not replay the route or watch it answer the real choices afterwards: in that test setup the evidence was absent, so the choice "refuse" was not offered and I stopped there.
  The answering code itself had worked in the earlier full run. **This needs one more full run to be sure** that the whole route needs no hand-holding.
- The finale's choice hold, for a game loaded with the transformation already seen: it should not hold (the sequence is marked finished on load); not exercised.

### Still outstanding
- A full uninterrupted run after the fixes (one more True route to the credits at a normal speed).
- Fast-forward ("Next chapter") is unreliable: from the start it left the bot circling in the living room. Not touched in this pass.
- Skip scene, Exit and the route selector were not clicked this time.
- Denial and Recognition endings not run again in this pass; the opening call was not watched at 1x.
- The two harmless "no grid path (walked straight)" warnings; no video; the first demo load takes about 45 s on this machine.
- Chapter contents in the table above come from the route's design; the Witness, Hollow and Unremembered encounters were not individually confirmed in the run.

## Files changed (cumulative)
`src/dev/observer/Observer.ts` (muted default, display, annotations, timer option, Play/Resume labels), `src/dev/observer/Bot.ts` (the walk fix), `src/core/Game.ts` (`?demo` alias),
`src/horror/HorrorDirector.ts` (`stageUpdate`), `src/story/Finale.ts` (stage update, camera aim, story-driven choice hold), `src/horror/Matron.ts` (`transformFinished`).

## Recording reliability fix (after the first recorded run was lost)
The first full recorded run ended at about game time 600 s (Chapter 4, 16:46:05) because the Vite client lost its HMR WebSocket, polled until the server answered, and
reloaded the page, which destroyed the game, the bot and the recorder. The server never stopped. The four segments from that run are kept unchanged
(`docs/full-story-demo/video/`), with a checksum-verified backup in `docs/full-story-demo/video-backup-run1-lost/`.
- **No Vite client in demo pages.** `vite.config.ts` has a development-only plugin (`demoNoReload`) that removes the `/@vite/client` script from pages opened with `?demo` or `?observer`.
  Without the client there is no WebSocket and no reconnect-and-reload code, so a disconnect has nothing to react to. Normal pages keep hot reload. Edits made while a demo page runs do not refresh it.
- **Unique files per run.** Every file of a run starts with its run id (`rYYYYMMDD-HHMMSS`, UTC), so a later run cannot overwrite or append to earlier footage. Uploads are retried and failures are counted.
- **Heartbeat and watchdog.** The Observer writes `<run>-progress.json` every 5 s (game clock, chapter, objective, evidence count, story-progress time, recorder and bot state, upload errors).
  `scripts/demo-watchdog.mjs` only reads those files and the segment files, and reports the first failure by wall-clock time (tested with `scripts/demo-watchdog.test.mjs` on synthetic files).

## Final recorded True Ending run (run id `r20261103-170933`)
One unattended run, 1x, muted, subtitles and annotations on, fresh Observer save, started with the passive watchdog already running. **It completed without intervention.**
- **Route:** all eight chapters, in order, with no teleporting, forced flags or manual solving (the bot used real keys and clicks). Chapter changes (game clock): 2 at 39 s, 3 at 266 s, 4 at 549 s, 5 at 882 s, 6 at 968 s, 7 at 1285 s, 8 at 1401 s.
- **True Ending:** `ending:true` at 1600 s, `ending:done` and the credits at 1637 s, "CREDITS AND POST-CREDIT TELEPHONE SCENE FINISHED" at 1686 s, `ENDING REACHED: true` (29 evidence items). The last frame I looked at (video 249 s of part 8) is the title/credit screen. I did not confirm the telephone line itself on screen, and the run was muted, so the ring is not in the video.
- **Matron transformation:** the true-form sequence flag is logged at 1513.5 s, which is 112 s into part 8. Frames from part 8 show her composed at 113 s, the head tilting by 125 s, and the long hair and stretched neck at 129 to 140 s, with subtitles. The run's clock was within 1% of real time during the finale (about 1.0 game-second per wall-second), so it played at its intended 21 s. The video is small (see below), so I did not judge the eyes and mouth.
- **Performance (heartbeat sampled every 5 s, 339 samples):** FPS average 79.8, median 81, 5th percentile 68, minimum 26 (one sample, Chapter 3). Game time to wall time: 1.00 (1681.7 game s in about 1686 s of wall time). Worker pacer confirmed in the loaded code before Play; no Vite client in the page.
- **Problems:** no stalls, reloads, bot failures or upload errors; the watchdog reported DONE. Quality limit: the **video is 417 x 1036 (portrait)**, because the browser pane was narrow in this run (the recorder uses the pane's size). Earlier test videos were 1536 x 1152.
- **Segments (all eight open and play; durations measured by seeking to the end):** `docs/full-story-demo/video/r20261103-170933-part-NN-*.webm`:
  01 ch1-the-telephone 1.6 MB 39.4 s; 02 ch2-homecoming 24.8 MB 226.1 s; 03 ch3-the-upstairs-room 30.9 MB 283.1 s; 04 ch4-family-portraits 37.0 MB 332.9 s; 05 ch5-the-matron 8.0 MB 85.8 s;
  06 ch6-eleven-years-ago 35.7 MB 316.9 s; 07 ch7-the-missing-night 10.2 MB 116.5 s; 08 ch8-the-last-door 25.7 MB 287.4 s. Total 170.9 MB, 1688.1 s (28 min 8 s). Log: `r20261103-170933-log.txt`; FPS samples: `docs/full-story-demo/final-run-samples.csv`.
- **Joining:** the segments are numbered in order and each starts when the previous one stops. A single-file join test in the browser failed for the full set with a buffer-size limit (about 171 MB), so a joined single video is not verified for this run (the earlier four-segment test did join). A joined file needs ffmpeg, which is not installed.
- **Earlier files kept:** the first four segments of the lost run and their backup, the slow run `r20261103-153326` (Chapters 1 to 7, ended when its page was replaced), and the short test files (`video-smoke-test/`, `video-pacer-test/`).
- **Normal save:** untouched (the demo uses its own save namespace and, for this run, the same origin, with a fresh Observer save).
