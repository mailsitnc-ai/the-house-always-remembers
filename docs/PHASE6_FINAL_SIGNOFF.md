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
