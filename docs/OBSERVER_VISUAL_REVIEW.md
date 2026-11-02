# Observer Mode visual review

A short (about 5 minutes) automated inspection at `http://127.0.0.1:5174/?observer=true&mute`, audio muted, 1280x720 viewport,
using the existing Observer walkthrough (no teleporting, no flags set). Nothing was modified in the game. Normal game save was not
touched (this origin had no save), and the observer's own save was left as the run made it. Phase 7 was not started.

## Screenshots (in `docs/observer-review/`)
| File | Shows |
|---|---|
| `01-observer-panel-before-start.jpg` | Game loaded; Observer panel at bottom right with the Start button and route selector. The normal menu has no Observer entry. |
| `02-opening-panel-controls.jpg` | The opening (siblings photograph with subtitle) and the expanded control panel: Pause, Restart, Skip scene, Next chapter, speeds, Annotations, Subtitles, Audio, route selector, Exit. |
| `03-living-room-annotation-objective.jpg` | Living room window; annotation "Footsteps detected upstairs."; the current objective at the bottom left; F3 overlay. |
| `04-index-card-inspection-annotation.jpg` | The bot examining the study card ("Daniel is examining it closely."), an evidence notice, the inspection view, objective. |
| `05-chapter3-locked-door-slowdown.jpg` | Chapter 3 objective "Find Emily's room", the status line "Ch 3 THE UPSTAIRS ROOM", a door prompt, and the browser at about 1 fps (see issues). |

## Scenes reached
- The opening (siblings photograph, subtitles), the living room, the first footsteps annotation, an inspection view, and the start
  of chapter 3.

## Scenes not reached
The family photograph inspection view (the run passed it between captures), the Witness in Emily's room, the Matron's first
appearance, the mirror, the final hunt, Emily's room, the confrontation and the True Ending. They were not reached because the
browser slowed to about 1 frame per second (see below) and I stopped, as instructed. No screenshots of Emily's room were taken.
These scenes were seen in earlier sessions (the mirror and Emily's room as screenshots, the true ending by state checks) but are
not part of this review.

## Visual review of what was captured
- **Panel:** readable (small monospace, dark translucent), clearly labelled developer-only, bottom right. It does not cover the
  centre of the screen, though it covers a little of the lower-right corner and objective line is at the opposite corner. Acceptable.
- **Camera and environment:** first-person view, wallpaper, window light, shafts of moonlight, doors and shelving render correctly.
  No clipping or broken geometry visible in these frames.
- **Annotations:** appear at the top centre in small text and are useful ("Footsteps detected upstairs.", "Daniel is examining it
  closely."). They overlap the F3 performance overlay area slightly at the top, and they fade after a few seconds.
- **Inspection view and HUD:** the card, evidence notice, subtitles and objective all display legibly.
- **Characters:** none were on screen in these captures, so recognisability of the Witness and Matron was not assessed here.

## Issues discovered
1. **Browser slowdown.** After about 3 minutes the embedded browser fell to about 1 fps (1,700 hitches), so the inspection was
   stopped. The same throttling was seen in earlier sessions when the pane is not actively foregrounded. This is the test browser,
   not evidence about a real Mac.
2. **Possible stall at a locked door in chapter 3.** Screenshot 05 shows the bot facing a locked door while its annotation says it is
   going upstairs, and the walkthrough clock advanced by roughly 300 game seconds between two checks with the status unchanged. This
   may be a stall (an earlier version had a similar door loop that was fixed) or a transient look at a door. It was **not** investigated
   further and is unconfirmed.
3. Timing: the opening plays in real time, so it takes about a minute before any exploration.

## Technical problems
- Page scripts were used to advance frames (the pane does not render at normal speed when hidden). No story flags were set.

## Is Observer Mode suitable for a full viewing session?
**Not yet confirmed.** The panel and annotations look right and the earlier full true-ending run succeeded, but this session showed a
possible stall in chapter 3 and could not reach later scenes. A full viewing session should first be tried once by the developer in a
visible browser window, with the browser pane foregrounded.
