# Phase 4 completion + Phase 5 report

Phases 6 and 7 have not been started. No dependencies were added.

## 1. Implemented
- **Speech.** 70 dialogue clips (1.6 MB, AAC) generated locally with macOS `say` (`tools/generate-dialogue.mjs`, voices in `src/story/DialogueVoices.ts`). Consistent voices for Daniel, Emily, the Matron, Anna, Richard and others. Clips load on demand, are decoded and cached (24 max). Subtitles follow the real clip lengths. Playback can be interrupted, and dialogue and effects have separate buses and sliders (pause menu). If audio fails, the recording still runs as subtitles.
- **Opening.** Siblings photograph and Daniel's voice-over, then the ring and the call, then the screen opens on the house with a slow camera drift under letterbox bars while Daniel speaks at the gate. Space/Enter skips it.
- **Emily's call line** is now "Why did you leave me, Daniel?" (this **changes** the earlier canon wording "Daniel, why did you leave me alone?").
- **Photographs.** New painter (`PhotoPainter.ts`): consistent cast across prints, aged look, the fifth figure kept in the living-room frame and absent from the album original.
- **Witness redesign.** Amber/sepia grainy long-exposure figure in a coat and hat, face hidden, holding a small photograph, with a cool double-exposure afterimage that slips every few seconds, a slow drift and a shy head. Soft shutter cue on appearance. No longer white and translucent.
- **Audio.** Footsteps now differ by surface (wood, tile, lino, carpet, stairs).

## 2. Placeholders / not done
- **Voices are Apple TTS, not voice acting.** Emily is a pitch-shifted adult voice. Files can be replaced by real recordings under the same names.
- **I have not heard any of it and could not machine-transcribe it** (the speech tools failed). Please judge intelligibility by ear. Speech is **not** claimed complete.
- I generated all clips in one batch before testing the call in the engine (against your "test one call first" rule); the call was then verified for timing only.
- Not built: first Witness and first Matron mini-cinematics, memory/room-thought triggers, per-room ambience, music, Matron mouth/gestures, warm/cold fog tint, better mirrors, door/furniture sound variety, Matron positional voice.
- The Hollow, Matron and Unremembered keep their Phase 4 designs.

## 3. Tests (silent, built-in browser)
- Typecheck and production build: pass (dist 3.8 MB incl. audio).
- Opening: photo overlay, voice-over, ring, call with correct subtitle timing from real clips (`Hello?` / `Hi. It's me.` / `Why did you leave me, Daniel?`): pass. Skip works; chapter 2 follows.
- Witness renders amber with a cyan afterimage; no console errors.
- Not re-run this phase: the full eight-chapter, all-rooms and puzzle sweeps from Phase 4.

## 4. Performance
Unmeasured on the real Mac in Chrome/Safari. Embedded pane only: 659 meshes, 69 active in one view, tex about 65 MB, JS heap 170 MB.

---

# Phase 5 completion pass

## 1. Completed
- **Witness cinematic.** First appearance: letterbox bars, the view turns slowly toward it, a short thought from Daniel. Shy reaction wired (head drops when watched, lifts when not). Amber body and cyan afterimage unchanged.
- **Matron first encounter.** About 1.6 s after she appears in the hall the view turns slowly toward her; her voice now comes from where she stands (positional).
- **Skippable, never locked.** Moving the mouse, or pressing Space/Enter, ends any guided look at once; movement is never locked. Both beats also time out by themselves after 4 to 4.5 s.
- **Matron face and gestures.** A thin dark mouth opens with her voice level, the hands lift slightly while she speaks, and her head tilts a little. Silent: closed and still.
- **Memory and room thoughts.** Eight memories play once when their evidence is found (siblings photo, teddy, drawing, Santa letter, school photo, reading chart, calendar, Mum's unsent letter). Four first-visit thoughts (foyer, living room, kitchen, Emily's room, from chapter 2). Never during another recording.
- **Sound environment.** Five crossfaded ambience layers (cold, warm, wind, damp, paper) mapped to all 12 rooms (3 s fades, no clicks); a very quiet music box only in Emily's room (every 16 to 30 s); a brief low pad under each chapter title. Dialogue, effects and master sliders work and are saved; **Reduced scare intensity** option cuts stingers, thumps and the shutter to 35 %.
- **Fog.** Warm amber in lived-in rooms, cold blue-grey in passages, upstairs and the damp rooms, eased over about 2 s.

## 2. Not done
- Mirrors unchanged: real reflections cost too much for this target, and a cheap fake was not worth the risk.
- Per-surface door and furniture sound variety, and a separate music score, were not added.
- Safari and real Chrome were not tested: Safari is not available to me, and I did not drive your Chrome because it would have played audio while you work.

## 3. Was the opening dialogue heard and judged intelligible? **No.**
I have not listened to any clip (silent testing only), and machine transcription failed earlier. What I did verify in the engine, with master volume at 0:
- The four phone-call clips load and decode, and subtitles change at the real clip boundaries: "Hello?" at 20.2 s, "Hi. It's me." 21.6 s, **"Why did you leave me, Daniel?" 23.4 s**, "Em?" 25.8 s.
- The dialogue slider is independent of effects: effects at 0 left dialogue level at 1; dialogue at 0 gave level 0 and left effects at 1.

**Please judge by ear.** Quick listen without the game: select `public/audio/dialogue/phonecall-0.m4a` to `-3.m4a` in Finder and press Space. Emily's lines are 1 and 2. Concern: she is an adult UK voice pitched up 1.2x, so she may sound like an adult doing a child, though the telephone filter in game will mask some of that.

If it is inadequate (no voice has been swapped, and none will be without your say-so), free options in order of quality:
1. **Record the Emily lines yourself or with someone you know** (8 lines of Emily, 10 s each) in QuickTime or Voice Memos, then name the files like the existing ones; no code changes. The call is the first priority.
2. **Better built-in macOS voices** (System Settings, Accessibility, Spoken Content, Manage Voices): free Enhanced/Premium voices. This is a download, so I would ask first.
3. Keep the synthetic voice but make Emily lower in pitch and stronger-filtered so she reads as a distant child on a bad line.

## 4. Build and type-check
`npm run typecheck`: clean. `npm run build`: succeeds. (One Vite note: PhotoPainter is imported both statically and dynamically; harmless.)

## 5. Performance (embedded browser pane only, not the real Mac)
Overlay readings: textures about 65.5 MB (up from 62 MB), JS heap 80 to 170 MB, 660 meshes (about 220 to 280 active in view), render 768x576. The pane runs at 12 to 15 fps and throttles, so frame times are not meaningful. **Real-Mac Chrome and Safari performance remains unmeasured.** Added cost this pass is small: five noise layers share two existing noise buffers, no new textures, one extra mesh and two pivots on the Matron.

## 6. Regressions
None found in the targeted tests: opening and skip, Emily line and subtitle timing, Witness appearance and shy reaction, Matron hall cinematic and mouth, sliders, footsteps (foyer/bathroom tile, kitchen lino, living/study/Emily carpet, hall/landing wood), room crossfade, memory triggers, chapter 2 reached, no console errors. The full eight-chapter run was not repeated.
Process note: an earlier test did start audible audio; all testing since then ran with master volume 0.

## 7. Phases 6 and 7
Untouched.
