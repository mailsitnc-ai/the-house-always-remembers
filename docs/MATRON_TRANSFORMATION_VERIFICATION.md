# Matron transformation: real-time verification

The Matron was not redesigned. Story, dialogue, voices, endings, save format and Observer Mode are unchanged; Phase 7 has not been started.
Typecheck is clean and the production build succeeds once more; `dist/` contains no showcase or Observer code.
Outputs are in `docs/matron-transformation-verification/` (56 files, 1 GIF per run, every frame opened and inspected).

## 1. The complete animation, played in real time
**Video is not available** from the browser tooling, so this is the timestamped-frame form you asked for, from one continuous run each.
- **How it was run.** The Matron's own `update` runs with the real elapsed time (clamped at 50 ms, as the game's loop does), the real flashlight
  update runs, and the scene is rendered every iteration. Nothing is posed and nothing is constructed: frames are grabbed when the animation's *own*
  clock passes each second. The two runs took **21.0 s and 21.4 s of wall-clock time** for the 21 s sequence, at 112 to 119 frames per second
  (2,354 and 2,451 frames), with **0 and 13 frames over 40 ms** (longest 37 ms and 92 ms; the 92 ms stall is at the start, in the studio run).
- **Why a timer loop.** The embedded browser throttles the engine's own render loop to 1 to 2 frames per second when its pane is not in the
  foreground (that, and not the Matron, is why earlier tests here looked slow), so the run is driven by a timer instead. It is still real time and real frames.
- **Two views.** *Studio* (`rt-studio-00s.png` to `-21s.png`): a clean full-body view. *Chamber* (`rt-chamber-00s.png` to `-21s.png`): the real confrontation
  room through the real player camera, lit by the real flashlight and the room's lamp, Daniel where the finale puts him.
- Required timestamps: `rt-studio-required-timestamps.png` and `rt-chamber-required-timestamps.png` (0, 3, 6, 9, 12, 15, 18, 21 s). All 22 frames: `rt-studio-contact-sheet.png`.
  Frame sequences as animated GIFs (one frame per second of animation): `rt-studio-1s-steps.gif`, `rt-chamber-1s-steps.gif`.
- Large final frames: `rt-studio-final-large.png`, `rt-chamber-final-large.png` (1600 x 1200).

**What I saw, beat by beat** (the numbers are the rig's own values, logged every frame):
| Time | Observed |
|---|---|
| 0 to 2 s | Composed: upright, hands clasped, short hair framing the face, eyes forward; the leftover lean and tilt of the unmasked stage ease out. |
| 2 to 7 s | **Completely still:** head roll 0.018 rad, yaw 0, neck 0.152 m, all unchanged for five seconds in the log. Only the stare is alive. |
| 8 to 12.6 s | The head tilts slowly (roll 0.11 rad at 8 s, 0.60 at 10 s, 1.04 at 12 s); the neck lengthens and bends with it; the head also turns away from Daniel. The torso does not move (torso yaw 0.000 throughout). |
| 9 to 15 s | The hair grows, floats and trails in long curves, then settles. |
| 13 to 18 s | The head turns back toward Daniel while still lying on its side. |
| 13.5 to 21 s | The neck cranes (0.15 m to 0.46 m), the body stretches (1.04 to 0.96 vertically), the arms drop to the knees, the hands unclasp, the eyes go black, the mouth gapes. |

## 2. What the animation check found
Checked from the logs (every frame) and by eye:
- **Sudden jumps: none during the sequence.** The fastest per-frame movement of any control in the sequence is the head yaw at **0.44 rad/s** (studio; 0.25 in the chamber), the head
  roll 0.29 rad/s, the neck lean 0.21 rad/s, the neck length 0.04 m/s, the body stretch 0.02 per second.
- **Head or neck separation: none.** In every frame the neck ends inside the skull, including at the maximum roll with the head turned. (The earlier sheet of stills showed the same.)
- **Animation stopping unexpectedly: none** (the clock ran 0 to 21 s and then held, as designed).
- **A mechanical snap that was found and fixed.** After the sequence ends, the form still goes "perfectly still" every 6 to 13 s, and this was snapping the head's idle sway to centre in about
  0.2 s (a measured head-yaw speed of **about 3 rad/s**). The return to motion was also fast. I slowed both (rate 6 to 2.6 and 1.5 to 1.2). Measured over a further 39 s after the end of
  the sequence, the worst head-yaw speed is now **1.28 rad/s**: better, still quick for an unnatural stillness event, and I judged it acceptable (it is the "goes still too suddenly" beat).
- **Hair hooks: reduced.** The first real-time frames showed locks flying up and out as stiff antlers at the float peak (see `tf-seq-e.png`/`tf-seq-f.png` in `docs/matron-transformation/`).
  Cause: gravity almost cancelled while each segment of a lock carried an independent wave. Changed: each segment may bend at most 0.36 rad from the one above (a hard limit);
  the wave travels slowly down the lock (a small phase step per segment) and neighbouring locks move together; the float is smaller (gravity reduced to 30%, not 15%, at the peak) and the wave amplitude is 0.3. The delayed response is kept:
  the hair stays down while the head tilts, then lifts and sweeps outward in long curves at about 12 to 15 s before settling (`v-hair-10.png`, `-12`, `-13`, `-15`). A few locks still end in a pointed sweep at the peak (the taper), but they are
  curves and not kinks.
- **Hair through the head or body: found and fixed.** The log counted about 80 hair vertices (of about 800) inside the skull at 10 to 11 s while the head rolled, and the frames showed hair lying
  across the neck and chest. Added: a skull ellipsoid and a torso ellipse (with a sloped shoulder top) that locks cannot enter. After the change the skull count is about 7 to 19 during the float and about 30 at rest after the sequence, and the torso count is 14 to 66.
  **These counts are crude** (fixed-size ellipses and counting ribbon vertices, whose width can poke past a segment centre) and are higher in the torso because the metric ellipse is wider than the sloped top; the frames show hair draped over the shoulder and chest, not through the dress
  (`v-hair-*.png`, `rt-chamber-final-large.png`). I did not see clipping in any frame, but a close look at the ribbon edges at the shoulder was not exhaustive.
- **Unnatural stretching:** the neck becomes 3 times as long and the arms about 2.2 times, which is the design. It is smooth: the stretch is spread over 7 seconds.
- **Mechanical or supernatural?** The first 7 seconds, the tilt and the late hair read as supernatural. The last 3 seconds (a grin and gape arriving together after the body has finished) are the
  most mechanical part, because the mouth morph is a plain ease; I left it.

## 3. The real flashlight
**Finding: the Matron was dark for two separate reasons; one was the capture, one is the game.**
1. *Capture.* In the showcase, `Game.update` does not run the flashlight (the game is on its menu), so the real beam stayed where it was last (in the foyer, 50 m away). The earlier "dark" shot was the beam pointing nowhere. I now call the **real** `Flashlight.update` from the capture and have removed the stand-in torch:
   beam position, direction, cone (83 degrees at 15 m range, intensity 3.6) and the Matron's materials were all checked: the flashlight and the chamber lamp are both in the light list of the Matron's meshes (`canAffectMesh` true), the flashlight's shadow generator holds only the 52 house meshes (none near the chamber), and nothing in the scene settings interfered.
2. *The game.* From the code of the real finale (`Finale.ts`): Daniel stands at (O.x - 0.75, O.z - 0.45) and turns to yaw "pi - 0.08", with the Matron appearing at (O.x, O.z - 1.7). She was **about 30 degrees off the line he faces** (and above it, as she is tall), which is at the very edge of a spot with an exponent of 14, so in the actual finale she would have stood nearly unlit at the edge of the view.
   **Changed** (staging only; no story, dialogue, timing or choices): the glide now turns to face her (`atan2(0.75, -1.25)`, which is the true bearing of her position) and tilts up slightly (pitch -0.2). The turn takes the same 3.2 s.
- **Result:** `rt-chamber-final-large.png` is the Matron lit by the real player flashlight (and the room's lamp at the finale's own level, 0.22), at the real distance (about 1.4 m): the face, cameo, buttons and hair are all lit. No stand-in light is used anywhere in the final verification.
- **Not verified:** I did not play the finale; the two numbers above (Daniel's position and angle) are from reading the code, and the finale's camera is then moved by the same code, so the framing in a real run should be checked.

## 4. Pacing and dialogue
**21 seconds is appropriate and I did not shorten it.** Five of the 21 seconds are complete stillness, which is where the anticipation is built, and the reveal (neck, body, eyes, mouth) is spread over the last 7 seconds, so it is gradual.
One change: the sequence now waits until she has faded in completely (the finale fades her in over 2.6 s), so the composed pose is actually seen. Previously the clock started during the fade.
Against the finale's script (estimated from the text, **not by listening to the audio**, and dialogue lengths are from word counts): the Matron appears; Daniel's turn takes 3.2 s plus 1.5 s; then "Your sister was very fond of you..." (two lines, roughly 10 s); then 1 s; then the first
confrontation speech (two lines, roughly 12 s) before the first choice appears. Counting from the end of her fade-in, the stillness falls while Daniel turns and the first line begins, the tilt and the hair fall during the first line, and the head turns, the neck and body change during the second line, so the transformation is **finished (21 s) before the first choice is offered (about 25 to 30 s)**.
She speaks while still, and while her head lies on her shoulder. The mouth opens with her voice as before. Nothing in the sequence blocks input or changes any choice.
- **Risk to check by playing:** the choice screen is not shown until the dialogue ends, but I have not confirmed that a quick player (who can skip) does not reach it earlier, in which case the grin and gape would appear behind the choices.

## 5. What worked, what failed, what was adjusted
- **Worked:** the continuous sequence plays as designed with no jumps, no separation and a smooth timeline; frame rate is not a concern in this browser once the loop is timer-driven.
- **Failed (found, then fixed):** hair hooks at the float peak; hair through the skull and chest; a snap in the post-sequence stillness; the actual flashlight not lighting her; the sequence clock starting during the fade-in.
- **Adjusted:** `MatronModel.ts` (hair bend limit, softer float, skull and torso collision, calmer stillness, a start that waits for the fade), `Matron.ts` (passes the fade state), `Finale.ts` (the turn aims at her), and the showcase (real-time driver, real flashlight, metrics). The showcase code remains dev-only.

## 6. Limits (not hidden)
- No video: frames and GIFs only. The GIFs are one frame per second of animation, so they show progression, not motion quality.
- The real-time run is driven by the showcase, not by the game's own render loop and not through a real finale. It was not tested on the target Mac.
- Hair-clipping metrics are rough. The hair edge near the hairline still shows a jagged alpha edge (unchanged).
- The grin and gape at 19 to 21 s is a plain ease.
- The finale's camera change (section 3) changes how the confrontation is framed, and I have not seen it in a real run.
