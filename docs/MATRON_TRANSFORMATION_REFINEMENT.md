# Matron true form: transformation refinement

Phase 7 has not been started. Story, dialogue, voices, chapter order, endings, save format and Observer Mode are unchanged. No dependency
or asset was added. `npm run typecheck` is clean and `npm run build` succeeds; `dist/` has no showcase or Observer code (a search for the
showcase and Observer identifiers finds nothing). Screenshots: `docs/matron-transformation/` (21 PNGs, 1600 x 1200, every one opened and inspected).

Kept from the previous design: the sideways head, the long trailing hair, the extreme proportions (tall, narrow, arms to the knees), the
green dress, cameo, ruff and keys, and the contrast between formal clothing and wrong anatomy.

## 1. Why the previous form looked like a broken rig
Diagnosed from the hierarchy, not guessed:
1. **Wrong pivot.** The head rolled about a point at the *top of the neck*, while the skull's centre was 0.23 m above it, so rolling swung the
   whole head out and sideways off the neck, and the end of the neck poked out beside the jaw.
2. **Rotation order.** The Matron's follow-yaw was applied *inside* the rolled frame, so "turn toward Daniel" spun the head around a tilted axis.
3. **Hair in head space.** The strands hung along the skull's own -y axis, so when the head lay on its side the hair stuck out sideways
   as if on wires. They were also 26 thin, stiff, regular tubes.
4. **No bend in the neck.** The head tilted but the neck stayed ruler-straight and only stretched.

## 2. What changed
**Hierarchy (`models/MatronModel.ts`).** `body > neck pivot > yaw node (Matron's follow) > head anchor (the rig's roll, pitch, turn) > skull`.
- The anchor is at the **base of the skull**, exactly where the neck ends; the skull's centre is 8.5 cm above it and the neck's top is
  tucked inside the skull. The head rolls about the neck, so it cannot detach from it, at any angle.
- The neck pivot also **bends** (about 0.38 rad) the same way the head rolls, so the neck curves into the tilt instead of staying straight.
- When the skull is stretched, its base is held on the neck. The neck is thinned as it lengthens.
- Order of rotations: the head's roll is applied first, then the turn about the vertical, so a tilted head turns to face Daniel with the ear still on the shoulder.
- The neck is a thinner crane (0.145 m stretching to about 0.5 m) that leaves the ruff.

**Hair, redesigned.** Eleven broad tapered locks (frayed, pointed ends, streaked strands, ragged edges) rooted at the hairline replace the 26 wires.
Each lock is a chain of 7 segments simulated in **world space**: every segment follows the one above it and gravity with its own lag, so the hair
hangs correctly whatever way the head points, trails the head's movements and settles afterwards. A travelling wave and a short weightless
float (gravity almost cancelled) give the "delayed, unnatural" answer to the head's movement. Hair grows from the scalp (shoulder length at the
unmasked stage, to about 1.2 m in the true form). It is rebuilt as ribbons each frame; that is about 11 x 75 vertices, only while she is in the unmasked or true form.

## 3. The transformation: a timed sequence (21 s)
It begins by itself the first time she is seen at the last story stage (the same story-derived trigger as before), is remembered with the
generic flag `seen:true-form` (so a loaded game shows the finished form and does not replay it; no save-format change), and does not repeat
later in the same run.

| Time | Beat |
|---|---|
| 0 to 2.2 s | **Composed.** Upright, hands clasped, head forward, eyes locked on Daniel. The lean and tilt of the unmasked stage ease out. |
| 2.2 to 7 s | **Completely still.** Idle drift, sway, the smile swing, and the head's following of Daniel are all faded out and then held (the only thing left is the locked stare). |
| 7 to 12.6 s | **The head tilts, slowly,** onto her shoulder; the neck bends and lengthens with it; the head also turns slightly away from Daniel (his side decides which). The torso does not move. |
| 8.8 to 15.5 s | **The hair answers, late.** It grows, floats nearly weightless, a wave runs down it, then it falls. Nothing about this is caused by the head's movement. |
| 13.2 to 18 s | **The head turns back toward Daniel, independently of the torso,** while still lying on its side. |
| 13.5 to 21 s | **The body gives up the human shape:** the neck cranes out, the body stretches tall and narrow, the arms drop to the knees, the hands unclasp, the eyes go black, then the mouth swings between grin and grimace. |
After it ends, she keeps a slow independent head sway and breathing; everything else is still. No sudden random rotations: every value is a smoothstep.

## 4. Final form
The same woman, no longer held to a human body: recognisable by the green dress, cameo, ruff and keys, the long black hair, the distinct sideways
head on a long bent neck, and a silhouette that is still unmistakable with no light (`tf-final-silhouette.png`). In the house she still stoops under
the ceiling (2.7 m) and in the chamber (2.42 m).

## 5. Screenshots (`docs/matron-transformation/`)
- Full body, front / side / back: `tf-final-front.png`, `tf-final-side.png`, `tf-final-back.png`. Silhouette: `tf-final-silhouette.png`.
- Face close-up: `tf-face-closeup.png`. Head at the resting position: `tf-head-rest.png` (t = 0, upright, the neck joining the jaw). Head at maximum: `tf-head-max.png`.
- Hair: `tf-hair-lag.png` (the sequence played for real to 11.4 s, so the hair has its true lag and float) and `tf-hair-settled.png` (the finished form after 3 s).
- The sequence, played for real: `tf-seq-a.png` to `tf-seq-i.png` (0.5, 4.5, 8.5, 10.5, 12.4, 14.5, 16.5, 18.5, 20.8 s) and the contact sheet `tf-sequence-contact-sheet.png`.
- The finished form in the real house corridor: `tf-final-hallway.png`. In the confrontation room: `tf-final-chamber.png`.

## 6. Limitations (not hidden)
- **I have not watched the sequence play in real time.** Frames were produced by running the real animation in fixed steps and capturing at set times;
  the pacing, the smoothness of the hair, and how 21 s feels with the dialogue under it are unverified. The still frames show every beat is reached and is deliberate, not that it feels right.
- The sequence was not triggered by playing the story to the confrontation; the trigger is code, and it was only exercised in the capture tool (`begin`, `seek`) and by typecheck.
- **The chamber capture is lit by a stand-in torch.** In that capture the game's own flashlight did not light the room's walls (the room's lamp
  alone left everything black, which I did not find the cause of); the shot uses the showcase's torch on Daniel's camera. I have not verified
  that the real torch reaches her in the real finale, and that should be checked in an actual run.
- The face, lying sideways, is mostly one large eye and a mouth when seen from the front; it reads best in the corridor shot. At the maximum roll,
  hair locks hang in front of the neck and jaw.
- At the peak of the float, a few locks curl up into sharp hooks (`tf-seq-e.png`, `tf-seq-f.png`); they are brief.
- Hair alpha edges are jagged on the hair cap near the hairline (unchanged from before).
- Real-Mac performance is unmeasured; the hair update is small (about 800 vertices and 11 normal recalculations per frame, only in the two last stages).
