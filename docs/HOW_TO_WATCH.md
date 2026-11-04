# How to watch the finished game (no manual play)

Start the dev server once: `npm run dev -- --port 5173`, then use `http://localhost:5173/`.

## A. Watch the recorded run (easiest)
Open `docs/full-story-demo/watch.html` in Chrome (double-click it, or open its `file://` path).
It plays the eight segments one after another and has buttons for each chapter and for Chapter 8 moments (mirror, Emily's room, the Matron's transformation, the True Ending, the credits).
Segments (`docs/full-story-demo/video/`, run `r20261103-170933`): `r20261103-170933-part-01-ch1-the-telephone.webm`, `-part-02-ch2-homecoming`, `-part-03-ch3-the-upstairs-room`,
`-part-04-ch4-family-portraits`, `-part-05-ch5-the-matron`, `-part-06-ch6-eleven-years-ago`, `-part-07-ch7-the-missing-night`, `-part-08-ch8-the-last-door` (all `.webm`).
Each opens on its own in Chrome by dragging it into a tab. The video is portrait (417 x 1036) and muted (no audio was recorded). Checksums: `docs/full-story-demo/final-run-sha256.txt`.
No installed tool can join the segments into one file (no ffmpeg; macOS `avconvert` does not read WebM).

## B. Watch the game play itself (Observer Mode), in a wide landscape window
`http://localhost:5173/?demo&timer` then press Play (muted; add `&audio` for sound). The True Ending takes about 28 minutes at 1x. The panel (bottom right) has pause, speed and subtitle controls.
Use a wide Chrome window for a landscape view. Route choices (true, recognition, denial) are in the panel. There is no chapter picker.

## C. Start at Chapter 8 (the hunt, Emily's room, the confrontation, the ending)
The Observer's own save slot holds a Chapter 8 checkpoint (saved after the mirror, with Daniel upstairs: "Get to Emily's room"). `&resume` continues from it:
`http://localhost:5173/?demo&resume&timer` then Play. (Verified in the app's browser pane. The mirror sequence is before this checkpoint; see it in part 8 of the recording.)
In a different browser the slot is empty. A copy of the checkpoint is in `docs/full-story-demo/chapter8-observer-checkpoint.json`. In that browser open `http://localhost:5173/?demo`, open the console and run
`fetch('/docs/full-story-demo/chapter8-observer-checkpoint.json').then(r=>r.json()).then(o=>{for(const k in o)localStorage.setItem(k,o[k]);location.href='/?demo&resume&timer'})`
(only the file fetch was tested, not the paste into another browser). Any later autosave overwrites the slot.

## Chapter 8 times in part 8 of the recording (seconds from its start)
Mirror about 28; Emily's room and the body about 77 to 87; the Matron's transformation about 112 to 135; the True Ending about 199; credits about 236; the post-credit telephone scene about 270 to 285.

## D. The three endings: Chapter 8 only (Observer Mode, no manual play)
Start the dev server (`npm run dev -- --port 5173`; it prints the port if 5173 is taken) and open a link in Chrome. Press **Play** (the highlighted button at the bottom right). All three routes start at the Chapter 8 checkpoint (`docs/full-story-demo/chapter8-observer-checkpoint.json`), skip Chapters 1 to 7, and use their **own save slot** (`thar.observer.true`, `.denial`, `.recognition`) loaded fresh on every page load, so they never affect each other or the normal game. Muted by default; add `&audio` for sound.
| Ending | Link | What you watch |
|---|---|---|
| True | `http://localhost:5173/?demo&timer&ending=true` | Hunt, Emily's room, the confrontation (answers: refuse, own, refuse), the 21-second transformation, RUN, the chase, the front door, the two photographs, the connection breaking, the door opening, credits, the silent telephone scene, the Matron's sting, BYE BYE., the menu. About 6 minutes. |
| Denial | `http://localhost:5173/?demo&timer&ending=denial` | Same up to the chase (answers: "I don't know what happened", own, refuse, so he is evasive), then Daniel does not run. She catches him ("Please... take me with my family."), the aftermath, the ritual, Emily's body rising with the Matron in it, the door opening for her. |
| Recognition | `http://localhost:5173/?demo&timer&ending=recognition` | Same up to the chase (answers: refuse, own, refuse, honest all the way), then Daniel does not run and is caught: the Recognition dawn scene and the credits. |
**The bot plays the chase (final polish pass).** It sprints through the dark rooms away from the Matron, is grabbed, and breaks free with the on-screen arrows (it presses the real arrow keys through the game's input about half a second after each appears, as a person would); the first grab is escaped on every route. On the Denial and Recognition links it runs again, is grabbed a second time and does not fight, so the ten seconds run out and the evidence-based ending plays. The True link breaks free of its first grab, then runs the front-door puzzle. Nothing is teleported or flagged: it uses the same movement, grab, struggle and puzzle code a player does.
**The dropdown switches routes properly.** The "Route" box in the Observer panel now loads the selected ending's own link above (it keeps `timer`, `audio` and `record`) instead of starting the whole story. **Restart** reloads the current link, so it restarts the selected ending at Chapter 8.
The older whole-story routes (`?demo&observer=denial`, `?observer=true`) still exist for developers but are not offered in the dropdown.

## E. Notes
Chapter 8 changed after the recording in section A: the confrontation now ends in a chase and a front-door puzzle (see `docs/ENDINGS.md`). The recorded footage shows the earlier version.

The recorded videos (`docs/full-story-demo/video*/`, hundreds of MB) are kept locally only and are not in the GitHub repository; `watch.html` needs them.

## Developer collision audit
With the dev server running, open any page (no `?demo` needed) and, in the browser console, run `await __debug.audit()`. It walks the real collision system over every floor and reports embedded points, sealed pockets, one-way steps (with a check that the player can always get out), the stairs both ways and whether every interactive object can be picked from a reachable spot. Development only: `__debug` does not exist in the production build.

## Player controls (current)
WASD move · Shift run · mouse look · **E** interact · **F** flashlight · **J** journal · **M** house map · **U** step free if stuck · Esc pause · F3 performance overlay.
**House map:** M (or "OPEN HOUSE MAP" in the pause menu) opens a plan of the house and pauses the game; M or Esc closes it. It opens on the floor you are standing on; click GROUND FLOOR / UPPER FLOOR, or press **1** / **2** (arrow up/down or Tab also switch). It shows your position and the way you face, the rooms you have been in (the others are dimmer), the stairs, doors, and a ring on the objective's room, only when the objective's own text names the place. Screenshots: `docs/house-map/`.
