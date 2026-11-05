# Ending conditions (Phase 6, final pass)

Logic lives in `src/story/Endings.ts` (the confrontation and `caughtEnding`), `src/story/Finale.ts` (the scenes) and `src/horror/Chase.ts` (the chase). Nothing is random. Dev builds: `__debug.endings` exposes the finale for tests.

## Facts (derived from state, never stored)
| Fact | True when |
|---|---|
| `reconstructed` | the night-order puzzle is solved |
| `memoriesDoubted` | how many of Daniel's six false memories evidence has doubted or refuted |
| `responsibility` | `reconstructed` and `memoriesDoubted >= 4` |
| `tapeExposed` | the voice-comparison puzzle is solved |
| `motiveClues` | how many of `house-statement`, `parish-letter`, `emily-room-note` are found |
| `mirrorSeen`, `bodySeen` | the mirror scene and Emily's room have been seen |
| `understandsMatron` | `tapeExposed` and `bodySeen` and `mirrorSeen` and `motiveClues >= 2` |

## The confrontation (three rounds, in Emily's reconstructed room)
| Round | Choices | Leads to |
|---|---|---|
| Offer | "Take me to her room." (`stay`) · "I don't know what happened." (`unsure`) · "That isn't what happened." (`refuse`, needs `responsibility`) | `stay` → **Denial**; others → Comfort |
| Comfort | "Stay." (`stay`) · "I did this. I'm sorry." (`own`, needs `responsibility`) or "I can't look at it." (`afraid`) | `own` → Plan; others → **Denial** |
| Plan | "Then it's mine to carry. Let it end here." (`accept`) · "No. But you don't get to decide what I do with it." (`refuse`, needs `understandsMatron`) | `accept` → **Recognition**; `refuse` → **the chase** |

## The chase (only after `refuse` in the Plan round)
She stops pretending: the 21-second true-form transformation plays in full, then the room comes apart and the objective bar says **RUN**. Daniel is in Emily's real room upstairs; she throws the door open, calls, and runs after a few seconds' head start. The house is dark except the foyer, the living room and the study (she will not cross lamplight). Once Daniel is in a lit room the hall sconce comes on too (the living room is reached through the hall). Lamps fail now and then, with a buzz and a flicker about a second before the room goes dark; one lamp is out at a time and returns after about eleven seconds. She is a touch under Daniel's sprint (3.0 m/s against his 3.1) while he is close, and surges when he opens a gap (up to about 3.9 m/s at ten metres), so she closes on a runner who wastes time and never on one who keeps moving. She re-plans her route five times a second. A red vignette and a heartbeat grow as she nears (silent in the light and during her head start). If she is running but has not moved for three seconds she is put back in the dark ground-floor room farthest from him (never within 8 m; not at all if he is upstairs). A lamp never fails in Daniel's own room while she is within 5 m.

**Grabbed** (she reaches him anywhere unlit, after her grace time): control is taken, he is turned to face her, and a **10-second struggle** starts. Five arrows are shown; press each in turn (arrow keys or W A S D). A wrong key costs one step of progress and locks the hands for 0.45 s; if an arrow is not answered within 2.4 s one step is lost; presses faster than 0.16 s are ignored, so mashing does not work. A bar shows the grip time left and another the window for the current arrow.
- **Breaks free:** she is thrown off and stunned for 2.6 s, Daniel is turned away from her, control returns, and the chase resumes; she cannot grab for 1.2 s after that. The chase clock (and the lamp schedule) keeps running; the 10-second grab clock is per grab, so every new grab starts from ten.
- **Held for 10 seconds:** the chase is over and `caughtEnding` decides (below). The ending is never random and never bypassed.
- Saving is disabled while held (autosave and manual save), so a save can never restore Daniel mid-grab. If the pointer is released the game pauses and the grab clock pauses with it.

**Caught for good** (the 10 seconds run out): `caughtEnding` decides. If Daniel was evasive at any point (Offer `stay` or `unsure`, Comfort `stay` or `afraid`) or never owned it, he is caught as a man who still wants to be taken somewhere safe: **Denial**. If he answered honestly all the way and owned it: **Recognition**. The objective bar then reads WATCH (Denial) or LISTEN (Recognition), not RUN.

**Reaches the front door**: the door says "Something is on the other side." and Daniel understands the line: nothing is outside, it is held shut from in here. The objective bar guides one step at a time (each step names the object and the place, never the answer; the same step is said more plainly after a minute stuck):
1. TRY THE FRONT DOOR: the foyer is lit and she cannot enter light.
2. FIND WHAT HOLDS HER TO THE HOUSE: it is not locked from outside; she was added to something the family keeps on display (the family photograph, living room).
3. FIND THE ORIGINAL PRINT (after looking at the photograph and seeing the fifth figure): the same front step was photographed twice; the original is kept with the family's other pictures (the study album).
4. PUT THE TRUTH WHERE THE LIE HANGS (after taking the print): swap it for the photograph in the living room. The picture changes, she cries out, every lamp fails together, and the house is silent.
5. OPEN THE FRONT DOOR: **True Ending**. The door opens only because the connection was broken.

## Endings
- **Denial / The Escape.** Daniel says "Please... take me with my family." The scene cuts to black and is heard, not shown. The reconstructed room: Daniel's body on the floor in a pool of blood with severe injuries (the one graphic image in the game). The Matron stands over Emily's bed and the ritual begins: dark threads from his chest to hers. Emily's preserved body sits up, stiffly, all of a piece. It is not Emily: black eyes, the head on one side, a smile held too long, the Matron's cameo at the throat and her keys at the waist, her voice ("It was never going to be Emily who got up."). She walks to the front door, which opens for her, and out into the light. Credits.
- **Recognition / The Confession.** Needs `responsibility` and the choices that own it, without the full understanding or breaking the plan. Dawn, Daniel leaves, one upstairs window is lit and she stands behind it.
- **True / The House Always Remembers.** Survive the chase, take the false picture out of the house, and open the door. Dawn, credits, the silent telephone scene, and then a final sting: black, a silence, the Matron very close, one vocal sting, BYE BYE., the main menu. The sting appears only after the True Ending.

## Test routes (dev only)
Chapter 8 only, from the checkpoint, each in its own save slot: `?demo&timer&ending=true`, `&ending=denial`, `&ending=recognition` (see `docs/HOW_TO_WATCH.md`). The denial and recognition links play the real confrontation with the answers listed there, then run through the dark rooms away from her, break free of the first grab, run again, and let the second grab's ten seconds run out. The true link also breaks free of its first grab, then runs the puzzle. `&test=chase` (with `&resume`) skips the confrontation and sets story flags; it is a test shortcut, not a demonstration.

## Photographs and the fifth figure (final polish)
The living-room frame shows Dad, Mum, Daniel (13) and Emily (8) **and the fifth figure**; the original print in the study album and the other family prints show the same four only (the Matron never altered the print). In the True Ending the print replaces the framed copy and the wall shows four. See `STORY_BIBLE.md`.

## Objective locations on the house map
The map rings the objective room only when the objective text names it: the foyer for TRY THE FRONT DOOR and OPEN THE FRONT DOOR, the living room for PUT THE TRUTH WHERE THE LIE HANGS, and the study or living room for the two earlier puzzle steps only after their plainer hint appears. Ending objectives (WALK OUT, WATCH, LISTEN) have no ring, and the objective clears when the credits start.

## Chapter 8, Question 2: both answers ended in Denial (fix)
**Status: fixed in the working tree, not yet committed.**

### What I could and could not establish
- The comfort round (Question 2) is `ROUNDS.comfort` in `src/story/Endings.ts`. It offers "Stay." (`stay`, always) and either "I did this. I'm sorry." (`own`) **if `facts.responsibility`**, or "I can't look at it." (`afraid`) **if not**. `stay` and `afraid` both lead to Denial by design; only `own` leads on (to the plan round). So **both options lead to Denial exactly when `responsibility` is false.**
- `responsibility` = the night is reconstructed **and** `memoriesDoubted >= 4`. `memoriesDoubted` was counted from `evidence.memories()`, i.e. only the memories that had **surfaced in the journal**. Memories surface on **timers** a few seconds after a chapter begins (`StoryDirector.surface`), and those timers are not saved. A game closed or reloaded in those seconds comes back with memories missing, even with all the evidence in hand.
- Demonstration (automated, real classes): with all required evidence and no memories surfaced, the old formula gives **0** doubted memories (so `responsibility` false, Question 2 = "Stay." / "I can't look at it.", both Denial); the evidence-based count gives **6**.
- **Not established:** that this is what happened in your game. I do not have your recording or save, so I cannot see which two options Question 2 showed. The symptom matches this cause exactly, and no other code path I traced can send both options to Denial (callbacks, option ids, stored decisions, Question 1 overwriting, an unconditional fallback: all checked and correct).
- The first problem in the previous run was not the game: my browser script waited for the confrontation while the browser pane was hidden (the game does not run while its tab is hidden), so it never progressed. I closed the tab to stop it.

### Files changed
`src/story/EvidenceSystem.ts` (`doubtedCount()`, quiet `introduce`), `src/story/Endings.ts` (`factsOf` uses it), `src/story/StoryDirector.ts` (`syncMemories()`), `src/core/Game.ts` (calls it after a load; dev hook `endingTests`), `src/story/Finale.ts` (clean decision flags at the start of each confrontation), `src/dev/EndingsTest.ts` (new, dev only), `src/dev/observer/Route.ts` (dev-only `&choices=` override).

### The correction
1. `memoriesDoubted` is now counted from the evidence found (`doubtedCount()`), not from which memories happened to surface. The threshold (4) and the meaning are unchanged. With the evidence the night reconstruction itself requires, at least four memories are contradicted, so Question 2 now offers "I did this. I'm sorry." to a player who has done the reconstruction.
2. After a save is loaded, memories whose moment has passed are surfaced silently (`syncMemories`), so the journal agrees.
3. Every confrontation starts by clearing all `decision:*` flags, so nothing from an earlier attempt can colour the next.

### Question 2 mapping (unchanged canon)
Option "Stay." -> Denial. Option "I did this. I'm sorry." -> plan round (then "Then it's mine to carry…" -> Recognition, or "No. But you don't get to decide…" -> the chase and the True Ending path). "I can't look at it." (only when responsibility is genuinely absent) -> Denial.

### Tests
- **Unit/integration (real `EvidenceSystem`, `GameState`, `ROUNDS`, `resolve`, `caughtEnding`), `await __debug.endingTests()`: 25 of 25 pass.** They cover: Question 2 options with and without responsibility; no dependence on surfaced memories; the Question 1 x Question 2 matrix (unsure/refuse x stay/own, plus Question 1 "Take me to her room"); each choice's destination; the plan round with one and two motive clues; being caught (honest -> Recognition; evaded, "Stay", or never owned -> Denial); a fresh attempt has no decisions.
- **Real game, through the on-screen choice keys (Observer, isolated `thar.observer.true` save):** unsure then Stay -> Question 2 showed `stay`/`own`, stored `comfort:stay`, **Denial**. unsure then own then accept -> stored `comfort:own`, plan round shown, **Recognition**. refuse then Stay -> **Denial**.
- **Loaded state:** a save with its surfaced memories emptied was loaded through the game's normal Continue; the journal came back with all 6 and `responsibility` true.
- **Not run after the fix:** refuse, own, accept in the real game; the full True route (chase, door puzzle, credits, post-credits); a real-game run of the unfixed code to watch Question 2 fail. True Ending logic itself is unchanged (the unit tests show it still resolves to the chase).

### Final True Ending verification (after the fix)
Observer True route from the Chapter 8 checkpoint (isolated `thar.observer.true` save, pane visible, progress watchdog, about 7 minutes), real on-screen choice keys, no teleport and no assigned flags:
- Question 1 showed: "Take me to her room." / "I don't know what happened." / "That isn't what happened." -> selected "That isn't what happened." (`refuse`).
- **Question 2 showed: "Stay." / "I did this. I'm sorry."** -> selected "I did this. I'm sorry." (`own`, stored `decision:comfort:own`).
- Question 3 showed: "Then it's mine to carry. Let it end here." / "No. But you don't get to decide what I do with it." -> selected the latter (`refuse`).
- Transformation (`finale:unmasked`), then the **chase started** (`finale:chase`, objective RUN, 3 grabs escaped), then the door sequence (`door-tried`, `photo-seen`, `print`, `anchor`), `ending:true` ("WALK OUT"), credits, post-credits, BYE BYE and the main menu.
- The 25 ending tests passed again; typecheck and production build clean; the bundle contains no Observer, debug or ending-test code.
