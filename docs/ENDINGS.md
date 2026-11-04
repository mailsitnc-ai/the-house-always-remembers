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
