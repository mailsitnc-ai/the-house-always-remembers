# Phase 6 final polish: sign-off report

Status: **implemented and tested with automation; NOT human-playtested. Recommend sign-off after the human checks in section 11.** See section 14 for the verification pass, GitHub and deployment.

## 1. Issues addressed
1. **Chase / grab / struggle** (`src/horror/Chase.ts`, `src/horror/Struggle.ts`, `src/story/Finale.ts`).
2. **True Ending puzzle clarity**: six sequential, specific objectives (`Finale.puzzleObjective`).
3. **Subtitles clipped by the cinematic bars**: one shared safe area in `index.html`.
4. **Reflection final stage**: root cause found (see 7); Emily's body silhouette rebuilt.
5. **HUD objective stuck on RUN** in Denial/Recognition: now WATCH / LISTEN; True shows WALK OUT.
6. **Observer bot** plays the real chase.
7. **Production separation** verified (no code change needed: guards were already build-time).

## 2. Files changed (this pass)
`index.html`, `src/horror/Chase.ts`, `src/horror/Struggle.ts` (new), `src/story/Finale.ts`, `src/ui/StoryUi.ts`, `src/core/EventBus.ts`, `src/core/Game.ts`, `src/world/Stage.ts`, `src/world/EmilyShroud.ts`, `src/horror/models/DanielModel.ts`, `src/dev/observer/Bot.ts`, `src/dev/observer/Route.ts`, docs (`ENDINGS.md`, `HOW_TO_WATCH.md`, `PHASE6_REPORT.md`, `STORY_BIBLE.md`, this file).

## 3. Tests actually performed
- `tsc --noEmit` and `npm run build`: clean.
- Observer runs in the embedded browser pane, muted (audio at master 0): True, Denial, Recognition, each from the Chapter 8 checkpoint.
- Real (trusted) keyboard events via the browser tool completed the struggle on a plain page (forced grab). Automated, not a human.
- Screenshots: subtitles above the bars; reflection final stage; Emily's body.
- Production preview (`vite preview`) opened with `?demo&timer&observer=true&ending=true&showcase`.
Not run: a full eight-chapter walkthrough (by instruction).

## 4. Chapter 8 routes (results)
| Route | Result |
|---|---|
| True | transformation, chase, several grabs all escaped, door tried, photo seen, print taken, anchor broken, `ending:true`, credits, BYE BYE, menu. (Run predates the lamp-fairness tweak below.) |
| Denial | grab 1 escaped, grab 2 held 10 s, objective WATCH, `ending:denial` at ~206 s |
| Recognition | grab 1 escaped, grab 2 held 10 s, objective LISTEN, `ending:recognition` at ~205 s |
Denial/Recognition scenes after the ending flag (ritual, possession, door) were not re-watched in this pass; they were verified in the previous pass and not changed.

## 5. Chase and grab mechanics
She runs 3.0 m/s (+0.003/s up to +0.2) against Daniel's 3.1 sprint, surging up to +0.95 m/s when 10 m away; replans every 0.2 s; 5 s head start; grace after start and after each escape; unstick teleport after 3 s without moving; red vignette and heartbeat as she nears. Grab: control locked, 10 s, 5 arrows (arrows or WASD), wrong key −1 and 0.45 s lockout, 2.4 s per arrow else −1, 0.16 s debounce. Escape: stun 2.6 s, turn away, 1.2 s grace; the 10 s clock is per grab. Failure goes to `caughtEnding` (unchanged). Lamps no longer die under Daniel while she is within 5 m. Saves are blocked while held; pointer release pauses the grab clock.
**Bug found and fixed during testing:** resuming after a grab reset the chase clock, which froze the lamp-relight schedule and caused repeated grabs.

## 6. Subtitles and HUD
Subtitle, toast, evidence toast, objective, inventory and choices now sit above `--safe-bottom` (bar height + 14 px) and above the bars (z-index 10), wrapping with a max width and height. Seen working in one real frame (speaker name, three wrapped lines). Not checked at other window sizes or aspect ratios, nor during credits/post-credits. Objective HUD observed in all three endings via the log.

## 7. Reflection and Emily
Reflection: the final-stage "blank pale face" was the **back of its head**: it walked in front of the camera still facing the glass. It now turns to face Daniel as it passes; also darker neck material, less light as it nears the glass, chin/camera framing, shorter neck stretch. Seen once, front on, in the pane: eyes, nose and mouth readable. Other viewing angles not checked. Emily: narrower waist, bent knees, feet, dipped neck, arms nearer the body; seen from one three-quarter angle as a small figure under the sheet.

## 8. Post-credits and audio
Post-credits sequence ran after the True route (BYE BYE then menu) and not after Denial/Recognition (flow unchanged). **No audio was listened to**; bus routing and sliders were inspected in code earlier and not re-verified. The new struggle sounds reuse existing sounds (click, thud, pulse, stinger, slam, shriek), not auditioned.

## 9. Observer development/production separation
Guards are `import.meta.env.DEV` (build-time). The production bundle has no Observer, Bot, route, showcase, `__debug` or checkpoint strings (only Babylon's own `Observer` class); `dist/` has no checkpoint file. In production, opening a URL with `demo`, `observer`, `ending` and `showcase` shows the normal menu (NEW GAME, SETTINGS, CREDITS), no panel, no `__debug`, no storage written. Continue was not shown (no save existed); Continue and New Game gameplay were not exercised in production.

## 10. Remaining limitations
- Embedded pane throttles an unattended game (~1 fps); timing there is not Mac performance. No real-device FPS measured.
- Bot reaction time is scripted (0.45-0.7 s), so the 10 s window's difficulty for people is untested.
- In the True run the bot was grabbed about eight times before the lamp-fairness change; the post-change True run was not repeated.
- Chase unstick, geometry soft-lock and door-exploit checks: no natural stuck case observed; no dedicated test.

## 11. Needs human testing
Struggle feel (window and pace), chase fairness, audio, subtitle layout at several window sizes, reflection at other angles, saving/loading around the chase, Continue/New Game in the production build.

## 12. Known bugs
None open that I found. Saving mid-grab is blocked rather than restorable.

## 13. Sign-off
Ready for sign-off **conditional on** the human checks above. Phase 7 not started.

## 14. Verification pass, GitHub and deployment

### Tests performed (embedded browser pane, muted, Observer slots only)
| Test | Result |
|---|---|
| True route rerun with the latest code (lamp fairness, farDark, retrying puzzle steps) | Passed: chase, 5 grabs all escaped, lamps relit about 11 s after failing, `door-tried` -> `photo-seen` -> `print` -> `anchor` -> `ending:true` -> `ending:done` -> BYE BYE -> main menu. No teleport or flag-setting. |
| First rerun attempt | The bot gave up after a lamp failure sent it to another room (a bot weakness, not a game bug); puzzle steps now retry until the game's own flag is set. |
| Lamp-relight schedule | Observed: each failure cleared about 10-11 s later; the chase clock is no longer reset by an escape. |
| Chase fairness (code audit plus runs) | Her speed is 3.0-3.2 m/s near him and at most 3.95 m/s at 10 m or more; the surge closes at most 0.85 m/s and only 0.1 m/s inside 4 m, so a runner who keeps moving is not caught. Grace: 6.5 s at the start, 3.8 s after each escape. Lamps no longer die under him when she is within 5 m. In the bot runs the grabs came when it walked back toward her, never from a surge catching a moving runner. Limitation: the bot is not a human. |
| Unstick teleport | Changed: it only fires after 3 s of no movement while she is walking and more than 2.5 m away, and now places her in the dark ground-floor room centre farthest from him, never within 8 m, and not at all if he is upstairs. Never observed firing in any run; not tested directly. |
| Pointer release during a grab | Tested (showcase page, separate save slot): the phase went to paused, the grab clock stayed at 8.51 s for 4 s, and ticking resumed on return. It can be used to pause and read, but gives no advantage and no broken state. |
| Save around a grab | Saving while held is refused (message shown; the save slot was unchanged). The save contains only story flags and position, nothing about a grab, and loading a chase save resumes in the foyer; a restrained state cannot be saved or restored. A load of such a save was not exercised. |
| Subtitle safe area | Measured at 1280x720, 1440x900, 1920x1080 and 420x760 with a long two-line line, a speaker label and letterbox on: always above the bottom bar, no overlap with the objective. Seen on screenshots at 1280x720 and 420x760. Because the objective overlapped the subtitle region, the objective moved to the top-left under the top bar. |
| Normal saves | `thar.save` and `thar.settings.v1` were byte-for-byte the same size before and after the True run; each ending uses its own `thar.observer.<ending>` slot. |
| Production preview | Menu shows NEW GAME, SETTINGS, CREDITS; no Observer panel or `__debug` even with `?demo&observer&ending&showcase`; NEW GAME starts the prologue (title card, "PROLOGUE - THE TELEPHONE"). |

### Could not be verified here
- **Production New Game past the title card, creating a save and Continue:** the embedded browser refuses pointer lock, which the game needs, and Claude in Chrome was not connected. Needs a human (or Chrome) test.
- Playing the deployed game with mouse and keyboard (same reason).

### GitHub
- Before this pass `origin/main` was 73bdcd6 (already deployed once); local was one commit ahead (94ebbc2, unpushed) plus uncommitted work. Both were pushed as a fast-forward (no force): 94ebbc2 and 4340c28 ("Phase 6 complete ... browser deployment prep"). The 466 MB of local walkthrough videos are git-ignored and not on GitHub.
- Repository: https://github.com/mailsitnc-ai/the-house-always-remembers (public, unchanged). Pages was already set to "GitHub Actions" as the source; no manual setting is needed.
- Workflow "Deploy to GitHub Pages" (checkout, Node 22, `npm ci`, typecheck, build, upload `dist`, deploy): run 41802697138 succeeded in 48 s.
- Published game: https://mailsitnc-ai.github.io/the-house-always-remembers/ . Opened in the embedded browser: the menu (NEW GAME, SETTINGS, CREDITS) appeared; 0 failed resource requests (JS chunks and `audio/dialogue/manifest.json` all 200); with `?demo&observer&ending&showcase` there is no Observer panel and no `__debug`; the checkpoint file is not served; a reload works; NEW GAME starts the prologue card. Not verified: actually playing with mouse and keyboard (pointer lock is refused in that browser), dialogue clip playback, and Continue.

## 15. Objective HUD fix (after the owner's own playtest)

### Root cause (found by reproducing it in a fresh New Game, not by reading the source)
The objective logic was working: the text was emitted and the element was filled. It was effectively invisible because:
1. **Layout collision.** The previous pass moved `#objective` to the top-left under the top bar, exactly where the performance readout (`#hud`, top-left) sits, and that readout was **on by default** (`showPerf: true` in `Settings.ts`), so every fresh game started with a 6-line debug overlay over the objective.
2. **Too faint.** 13 px dim text at 60% opacity with no background, over busy wallpaper; the hint line was hidden entirely after nine seconds.
3. **Why my earlier tests missed it.** The Observer shows its own "Objective:" line in its panel, and my subtitle measurements used an injected objective, so the real HUD was never looked at in a normal game.
Chapter 1 (the prologue) has no objective by design; the first objective appears when Chapter 2 begins.

### The fix (`index.html`, `src/ui/StoryUi.ts`, `src/platform/Settings.ts`)
- `#objective`: top-left, z-index 11 (above the cinematic bars and subtitles), on a dark plate with a gold left border, an "OBJECTIVE" label, a 14-18 px main line and a 12-14 px hint that is **always shown**; the 9-second highlight is now a glow only. Hidden when empty.
- The performance readout moved to the bottom-left and is **off by default** (F3 or Settings still toggle it).
- The objective is cleared when the credits start; credits and BYE BYE now sit above it (z-index 13/14).
- No story, ending or objective-text change: all six True Ending objectives, WALK OUT, WATCH and LISTEN are emitted by the same code as before.

### Observed in the browser (dev server, fresh origin, volume 0; the pointer-lock step used the dev `play()` hook because the embedded browser refuses pointer lock; keys were real browser key events)
- New Game via the real menu button, Enter to skip the prologue: "OBJECTIVE / Go into the living room." with its hint appeared and was still there 14 s later, readable, above the scene.
- Teleported (dev helper) into the living room: it changed to "Examine the family photograph." and the prompt "[E] Examine photograph" showed without overlap.
- Pressed E (real key): the photograph opened and the objective changed at once to "Read Mum's note in the kitchen." with its hint; it stayed visible during the inspection view, beside the "Evidence added" notice with no overlap.
- Letterbox on with a subtitle (events injected): the objective sits on the top bar, the subtitle above the bottom bar, no overlap (measured rectangles and a screenshot).
- `credits:show` (injected): the objective text cleared.
### Production build
Built and served with `vite preview`: the menu showed NEW GAME, SETTINGS, CREDITS with `?demo&observer&ending=true`; the computed style of `#objective` had z-index 11, a 3 px border and 16 px text; the performance readout was hidden; no `__debug`, no Observer elements, 0 failed requests. The production bundle has no Observer or checkpoint strings.
### Not verified
- Chapters 3-8 objectives in a normal game were **not** played this pass; the Chapter 8 and True Ending objective texts were observed earlier (previous passes) in the DOM through Observer runs, and the new styling was not re-checked on those exact texts. The longest hints wrap within the 520 px plate by CSS but were not screenshotted.
- Playing the production or deployed game past the title card (pointer lock), by me. The owner has played it in Chrome.

## 16. Photograph, collisions, consistency and objective follow-up

### Photograph (root cause and fix)
- **Cause (observed by rendering the painter's output):** the living room had **two** frames on its west wall 1.4 m apart: the family photograph (`family-five`: four people plus the fifth figure) and a second "Framed photograph" of **Daniel and Emily only** (`siblings`). The opening cinematic also shows the two children. A player sent to "the family photograph" could open the wrong one. In the siblings picture Daniel was also drawn with adult proportions (no adult beside him to show his age).
- **Fix** (`PhotoPainter.ts`, `GroundFloor.ts`, `StoryData.ts`): Daniel and Emily get child proportions (bigger head, narrower shoulders; Daniel 13, Emily 8); the second living-room frame now shows the house from the lane (empty); the album-print description now says "a boy of about thirteen and a girl of about eight" (it said twelve and seven). The fifth figure stays only in the living-room frame; the album print and the other family prints show four people; the True Ending's replacement print shows four.
- **Observed** (rendered canvases): family-five shows Dad, Mum, Daniel, Emily and the dark fifth figure; family shows the four only; siblings now reads as a boy and a girl. **Observed in a fresh normal New Game** (dev server): the prompt "[E] Examine photograph" appears at the wall, E opens the inspection view with the whole print visible and uncropped, E closes it, and the objective moves from "Examine the family photograph." to "Read Mum's note in the kitchen." with no stall.
- The objective plate now hides during the full-screen inspection view so it cannot cover a corner of what is being read.

### Collision and softlock audit (automated, real collision system)
- New dev-only tool `src/dev/CollisionAudit.ts` (`await __debug.audit()`, absent from production): a 0.3 m grid over both floors (1,656 ground and 992 upper cells), real ellipsoid collision, doors open. Results: **0 trap points**: every one-way step found (43 ground, 44 upstairs, all in the dining room, kitchen, living room, study, bathroom and the two bedrooms) has a way out, checked with a 0.1 m search; the stairs walk up and down; **60 of 63** interactive objects can be picked from a reachable spot (the other three are the suitcase letters, which only exist after the suitcase is opened, and were read in the earlier Observer runs). Sealed pockets (open floor the player cannot enter, e.g. between furniture) exist in every room: they cannot trap anyone because they cannot be entered.
- No collider needed changing.
- Limits: 2-D grid at eye height with doors open; closed-door and Matron-chase doorway collisions were not re-tested; furniture was not individually inspected by eye.
- **Recovery** (`src/player/Recovery.ts`, `Game.ts`): if movement keys are held for 3 s with less than 0.12 m of movement a toast says "Stuck? Press U to step free."; U moves Daniel at most 1.6 m to the nearest open spot in the same room and floor in line of sight (never through walls, never within 2.5 m of the Matron, not during a scene or a grab), and changes nothing else. Tested automatically: the guard fires after about 4 s of blocking and never while moving or idle; stepFree moved Daniel 0.4-0.8 m to an open spot from six wedge positions on both floors. The full key-to-toast path was not seen in a running game (the browser pane pauses the game when hidden).

### World consistency audit
- Evidence versus rooms: all 22 evidence items with a physical object are in the room their journal entry names (script, observed). The tape and recorder evidence has no `read:` object by design (decks).
- Objective hints versus the house (source plus positions): kettle and note (kitchen), Emily's door (west, first from the stairs top), study east of the foyer, album in the study: consistent.
- Chapter conditions reference existing evidence: consistent.
- Found and fixed: the second living-room portrait; the album-print ages (twelve/seven vs thirteen/eight); the siblings painting's adult-sized Daniel.
- Not audited exhaustively: every line of dialogue against what the player has seen; entity-before-introduction timing in each chapter.

### Normal gameplay and Chapter 8
- Observed in a fresh normal New Game (dev server, real menu click, real keys, pointer lock bypassed by the dev `play()` hook): the opening objective with hint; "Examine the family photograph." in the living room; E opens the inspection; the objective changes to the kitchen note on close.
- Chapter 8, Observer routes on the final code (automation, muted): **True** reached `door-tried`, `photo-seen`, `print`, `anchor`, `ending:true`, credits, BYE BYE and the menu; the six puzzle objectives and WALK OUT appeared in order and the objective cleared when the credits began. **Denial**: grab 1 escaped, grab 2 held 10 s, WATCH, `ending:denial`. **Recognition**: first grab escaped, second held, LISTEN, `ending:recognition`. (In Recognition the bot evaded for about 100 s before the first grab, so a runner who keeps moving can stay ahead.)
### Production build
Typecheck and build clean; the bundle has no Observer, audit, debug or checkpoint code; the preview menu shows NEW GAME, SETTINGS, CREDITS with the Observer URL parameters, no `__debug`, 0 failed requests, and the new "U step free if stuck" hint.
### Still needs a human
Playing in Chrome (pointer lock), chair-by-chair collision feel, closed-door and chase-doorway collisions, the U recovery in a running game, audio, real Mac performance.

### Deployment of commit 528e116 (observed)
GitHub Actions run 41817899169 succeeded. The published page (https://mailsitnc-ai.github.io/the-house-always-remembers/) was opened in the embedded browser with `?demo&observer=true`: menu NEW GAME / SETTINGS / CREDITS, no Observer elements, no `__debug`, 26 resources, objective plate styling live; the deployed bundle contains the new photograph frame text, the thirteen/eight text and the recovery toast, and no Observer strings; New Game starts the prologue card. One audio clip (`phonecall-1.m4a`) returned a single transient 503 on first load; it then returned 200 on three retries and all 71 dialogue clips returned 200. Not done: playing the deployed game past the title card (pointer lock is refused in that browser), so the deployed photograph inspection was not seen; the dev-server observations above are the evidence for it. `index.html` is cached for 10 minutes by GitHub Pages; JS and CSS are content-hashed, so a refresh after a deploy picks up the new build within that time.

## 17. Tape recorder fix and house map

### Tape recorder: cause and fix
- **Cause (observed by looking at it in the study at player height):** the deck existed and was interactive, but it was a 36 x 10 x 22 cm box in near-black (#181410) on dark wood in a dim room, with only two thin pale slits for detail: it read as a shadow, not a recorder. It also overlapped the desk blotter by a few centimetres. Its interaction mesh was the visible body itself (no invisible collider, no floating prompt), and the pick ray is only the player's own view within 2.3 m.
- **Fix** (`src/world/props/TapeDeck.ts`, `GroundFloor.ts`): a new 46 x 12 x 30 cm 1970s family cassette deck: beige body, walnut end caps, dark fascia with two VU meters, five piano keys with a red record key, a top-loading cassette bay with a labelled cassette and two pale reels, three speaker slats, two knobs and an amber LED. The pick body is the whole deck. Position: the **right side of the study desk top** (local x 0.4, z 0.15; world about 10.6, 0.76, 4.35), front toward the chair; the blotter and the tax-notice letter moved left so nothing overlaps. The living-room cassette player uses the same model.
- **Objective:** Chapter 5 had only a chapter-level sentence. It now has three steps in `Objectives.ts`: "Play the tape that was left in the study" (names the desk, the cream deck and the red button), "Listen to two real recordings of Emily", "Compare the voices in your journal".
- **Observed in the running game (dev server, real E key, volume 0):** the deck is clearly visible from standing height (screenshot); from (10.6, 3.2) looking at it the prompt is "[E] Use tape deck" and the pick tag is `deck:study`; 2 m away or looking away gives no target; real E opens "DAD'S TAPE DECK"; after Chapter 5 begins it lists EM 7 — CANDLES, NOTE TO SELF and FOR DANIEL; each plays with the right subtitle and speaker (DAD "Right, everyone. Candles...", DAD "Saturday. Ten past six.", EMILY "Daniel, it's all right now."), Stop works, Esc closes the panel and movement keys work afterwards; after saving and Continue the deck is in the same place (still `deck:study`) and the objective is restored. **Scripted, not played:** to reach Chapter 5 quickly the four prerequisite pieces of evidence were collected through a dev call; the Chapter 5 objective text and the third tape were then observed. The full Chapter 2-5 walk was not repeated; the earlier Observer walkthrough covered it before this change.

### House map
- `src/ui/MapUi.ts` (new), `index.html`, `Game.ts`, `Ui.ts`, `Objectives.ts`, `Finale.ts`, `EventBus.ts`. It draws the real `ROOMS`, `WALLS` (doors, cased openings, windows) and `STAIRS` from `Layout.ts`: ground floor (foyer, hall, rear passage, living room, dining room, kitchen, study) and upper floor (landing, Daniel's room, Emily's room, bathroom, storage), plus the stair connection on both floors. Controls: **M** (or pause menu "OPEN HOUSE MAP") opens and closes it, Esc closes it, tabs or **1**/**2** switch floors. The game is paused while it is open (it is its own game phase; the player and interaction updates do not run).
- Knowledge rules: all room names are shown (Daniel grew up here); rooms visited this game (`visited:<room>` flags, saved with the game) are brighter; the objective ring appears only if the objective's own text names the room (e.g. the living room for the photograph, the kitchen for the note, the study for the tape, the living room for "PUT THE TRUTH WHERE THE LIE HANGS"); "FIND THE ORIGINAL PRINT" and "FIND WHAT HOLDS HER" get a ring only after their plainer hint (which names the study / living room) is shown, so the map never solves the puzzle. Nothing outside the 12 rooms is drawn (the staged mirror/chamber room is not on the map; standing there shows "You are somewhere else in the house." and no marker).
- Observed (dev server): opens with M in all 12 rooms and on the player's own floor with the right tab marked; closes with M and with Esc; floor switch by key 2, by clicking a tab; the marker points the way the player faces (screenshots below); no marker on the wrong floor; no marker outside the house; the pause-menu button opens it and Esc returns to the pause menu; W and E held for 2.5 s while it was open changed neither position nor evidence; after examining the photograph with a real E press the ring moved from the living room to the kitchen; after saving, reloading and Continue the map opened with the restored position and visited rooms. Layout checked at 1280x720, 1920x1080 and 420x760 (canvas, legend and footer fit without overlap); the objective plate hides while the map is open; a redraw takes about 0.13 ms (measured in the embedded browser; the map has no animation loop, so there is no continuous cost; real Mac performance was not measured).
- Screenshots (canvas exports from the running game): `docs/house-map/ground-floor.png` (player in the living room facing west), `docs/house-map/upper-floor.png` (player in Emily's room), `docs/house-map/upper-floor-you-are-downstairs.png` (upper tab while standing downstairs: no marker).

### Other fix found while testing
- After the credits began, a later flag change re-showed "WALK OUT" over the post-credits scene. The objective now stays cleared once credits start (from an ending; the menu's Credits button is unaffected). Verified with injected events.

### Regression
Typecheck and build clean. True route (Observer) reran on this code: chase, `door-tried`, `photo-seen`, `print`, `anchor`, `ending:true`, credits, BYE BYE and menu; the objective rooms were `foyer`, none for "find the print" until the plain hint, `living` for the swap. Denial and Recognition were **not** rerun this pass (their code is unchanged except the objective event gained an optional room). The collision audit was not rerun after the deck was enlarged (the deck sits on the desk top, away from walking space; the desk collider is unchanged). Production: menu shows NEW GAME, SETTINGS, CREDITS with the Observer parameters, no `__debug`, 0 failed requests, the map overlay and button present in the page, the map and deck code in the bundle, no Observer strings.
### Not done
Playing the map and the deck in the production or deployed game (pointer lock is refused in the embedded browser), a human playtest, closed-door and chase-doorway collision, audio.
