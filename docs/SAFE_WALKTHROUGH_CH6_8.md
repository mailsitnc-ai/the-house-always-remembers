# The House Always Remembers: safe walkthrough, from Chapter 7 to the endings

Built from the current source (`src/story`, `src/horror`, `src/world`), not from memory. Anything I could not confirm is marked **[unverified]**. Map references use the in-game house map (**M**): ground floor = foyer, hall (with the stairs on its east side), rear passage, living room, dining room, kitchen, study; upper floor = landing, Daniel's room, Emily's room, bathroom, storage room.

## 0. Where you are (from your screenshot)

**Established by the screenshot and the source**
- **Chapter 7, THE MISSING NIGHT.** The HUD text "Piece together the evening Emily was last heard from. Open the journal (J) and look at the timeline." is, word for word, the Chapter 7 objective (`CHAPTERS`, `src/story/StoryData.ts`). Chapter 7 has no step-by-step objective; it only shows this sentence.
- Chapter 7 can only start after **Mum's letter to Dad (`anna-letter`) was collected** (that is the rule that ends Chapter 6). So the storage room, the suitcase and that letter are done.
- Chapter 5's puzzle (the tape comparison, `puzzle:voice-analysis`) must also be done, because Chapter 6 only starts after it.
- You are looking up the central hall toward the stairs (the stairs rise on the right/east side). The room label is cut off, so "hall, near the foot of the stairs" is my reading of the picture, not something the HUD states.
- "Carrying: box of matches, brass …": the box of matches (dining-room sideboard) and the brass key (kitchen drawer; it unlocked the storage room door). The line is cut off, so I cannot tell if **batteries** are also in the list. The matches have no use anywhere in the code I searched.

**Not established (the recording cannot tell me)**
- Which optional evidence you hold; whether the answering machine has been powered; whether you already have the **telephone bill** (`phone-bill`) and **message 3** (`machine-msg3`). The journal tells you in ten seconds (step 1 below).
- Whether the Chapter 7 radio voice (see warnings) has already happened.

## 1. DO THIS NOW (your checkpoint)

**CURRENT LOCATION:** hall, foot of the stairs (see above).

The only thing Chapter 7 needs is the **"Reconstruct the night" puzzle**. It unlocks only when the journal knows all five key moments of that evening. Those five come from five pieces of evidence:

| # | Moment (journal text) | Evidence that supplies it | Where |
|---|---|---|---|
| 1 | Mum and Dad go out for the evening. Daniel is left in charge of Emily. | Mum's note by the kettle (`kitchen-note`) | kitchen worktop (you have it: Chapter 2) |
| 2 | 7:05 pm. Emily records her last tape. She and Daniel are arguing. | Emily's toy recorder "EM 3" (`emily-recorder`) | Emily's room, desk (you have it: Chapter 3) |
| 4 | 8:20 pm. Dad rings the house. Nobody picks up. | Answering machine, **message 3** (`machine-msg3`) | rear passage, telephone table |
| 5 | 8:51 pm. Someone in the house calls for help. | **Itemised telephone bill** (`phone-bill`) | study, desk drawer |
| 6 | About 9:10 pm. Mum and Dad come home. Daniel is in the house. | Mum's letter to Dad (`anna-letter`) | storage room suitcase (you have it) |

(There is deliberately no moment 3: the journal shows a gap "7:08 pm to 8:20 pm: Nobody wrote this part down.")

### Step A. See what you are missing
1. Press **J**.
2. Click the **Timeline** tab.
3. Look at the rows under "That night". A row with a **?** ("Something is missing here…") is missing evidence. Rows 4 (8:20 pm) and 5 (8:51 pm) are the ones I expect to be "?".
4. If all five rows have text, skip to **Step D**. If a "Reconstruct the night" button is already there, you can skip to Step D as well.
5. Press **J** (or Esc) to close the journal.

### Step B. Message 3 (8:20 pm). Skip if the row already has text
Needs batteries first.
1. **Batteries** (skip if the HUD already says "Carrying: … batteries"). They are in the **storage room**, upstairs.
   - From the hall, walk up the stairs (east side of the hall). At the top you are on the **landing**.
   - The **storage room door** is at the north end of the landing, straight ahead and a little to your left of the stairs top (the door is at x 6 to 7, z 9.5). It is already unlocked if you have used the brass key.
   - Inside, the **light switch is on the wall just left of the doorway** (west of the door, as you enter). **[unverified wording: it is a wall switch; prompt text not checked]**
   - The old **torch** lies on the **top shelf of the shelving along the north wall**, a little left of centre (about x 6.2). Look up at it. The prompt is **"Take batteries"**: press **E**. Expect a toast: "Two heavy batteries from the old family torch…"
2. Go back down the stairs to the **hall**, then north through the wide opening at the far end of the hall into the **rear passage** (the narrow dark passage ahead; it ends at the back door).
3. The **table with the telephone** stands against the **east wall** of the rear passage, close to the opening you came through (about x 7.7, z 8.55). The answering machine is on it, next to a green phone.
4. Look at the machine. The prompt is **"Use answering machine"**. Press **E**.
   - With batteries: toast "You fit the batteries. A small red light comes on." (the batteries are used up).
   - Without: "The battery compartment is empty…" (nothing is lost; fetch the batteries).
5. Press **E** again on the machine. The tape panel **"Answering machine"** opens with two entries: **"Messages 1 and 2 (afternoon)"** (optional) and **"Message 3 — 8:20 pm"** (needed).
6. Click **Play** on "Message 3 — 8:20 pm". Subtitles show the message. You can play "Messages 1 and 2" too.
7. Press **Esc** to close the panel. **SUCCESS CHECK:** a toast "Evidence added: Answering machine: message 3"; the Timeline row for 8:20 pm now has text.

**WHAT TO EXPECT:** a recorded phone message. Nothing appears.
**SCARE WARNING:** none scripted in the rear passage. The rear passage and the landing are dark and are among the places where the random scares can fire (see section 3).

### Step C. The telephone bill (8:51 pm). Skip if the row already has text
1. From the hall go **east through the foyer door into the study**: the study door is on the east wall of the foyer. It is locked by a **keypad (code 317)** if you have not been in; you have, since Chapter 4's album is in the study.
2. The **desk** is against the north wall of the study (about x 11, z 4.5), with the chair on the south side. The **cream tape deck** sits on its left half as you face the desk.
3. Stand in front of the desk (south side). Look at the **drawer in the front of the desk, under the tape deck** (left half). Press **E** to open it. **[unverified: prompt wording for the drawer]**
4. Inside lie two sheets: a "Bank statement" (the left one, nothing unusual) and the **"Telephone bill"** (the right one, "Itemised bill - October", with a Friday 20:51 call to 999). Look at the **right-hand sheet**; the prompt is **"Examine note"**. Press **E**; read it; press **E** again to put it away.
5. **SUCCESS CHECK:** "Evidence added: Itemised telephone bill"; the 8:51 pm Timeline row now has text.

**SCARE WARNING:** none scripted. The study is a dark room, one of the places a "pale face" glimpse or the Hollow can appear (section 3).

### Step D. Before you press the puzzle: collect everything optional first
**This matters, and it is the one thing I would not skip.** Solving the puzzle starts **Chapter 8 immediately**, and Chapter 8 opens with the mirror scene and then a hunt. Your ending depends on what you hold when the confrontation begins, so finish the optional evidence now (section 5 lists all of it and where each item is). At minimum for the **True Ending** you need **two of these three**: Bank statement (`house-statement`), Parish letter (`parish-letter`) (both in the suitcase) and Mum's note on the dresser (`emily-room-note`, Emily's bedroom).

Also **save**: Esc → **SAVE GAME**.

### Step E. Reconstruct the night
1. Press **J** → **Timeline**.
2. Click **"Reconstruct the night"**. Five cards appear in a mixed order.
3. Click the cards in this exact order (this is `nightOrder()` sorted by event order):
   1. "Mum and Dad go out for the evening. Daniel is left in charge of Emily."
   2. "Emily records her last tape. She and Daniel are arguing."
   3. "Dad rings the house. Nobody picks up."
   4. "Someone in the house calls for help."
   5. "Mum and Dad come home. Daniel is in the house."
4. Click **Check**. If wrong the cards reset ("That is not how the evening went. Look at the times in the timeline above."); try again, there is no penalty.
5. **SUCCESS CHECK:** chime, toast "The evening is in order. An hour of it is still missing.", and a **chapter card, "CHAPTER 8 · THE LAST DOOR"**. The objective becomes "The bathroom light is on. Something is waiting in the mirror." Five seconds later Daniel thinks: "The bathroom light is on. I didn't switch it on."

> **SCARE WARNING: stop here and decide.** The next objective takes you to the mirror scene, then a hunt, a confrontation, a transformation and a chase. See section 5. You can pause with **Esc** at any moment.

## 2. Settings that help (existing options only; nothing in the game is changed)
Open **Esc → SETTINGS** (or the main menu's Settings):
- **Reduced scare intensity**: switches off the brief field-of-view kicks and one-frame dips of the jump scares and lowers sudden sounds. (`reducedIntensity`.) It does **not** remove any scene, entity or the chase.
- **Reduce sudden audio**: softens sudden stings further. (`reducedAudio`.) **I inspected how these are wired in code; I have not listened to them.**
- **Master / Dialogue / Effects volume**: the Matron's cries and stings go through Dialogue and Effects; turning **Effects volume** down is the most direct way to soften a sting without losing speech. **Subtitles** should stay on.
- **F3** toggles the performance overlay that is on screen in your screenshot.
- **Esc pauses at any time**, including during cutscenes, the chase and a grab; the game (and the 10-second grab clock) stops. **Space or Enter skips the current scene** when Daniel's controls are locked in a story scene (it does not skip a choice). Skipping still applies everything the story needs. **[Tested for the grab clock; scene skipping is in the code and was used by the automated player, not by me as a player.]**
- **Watching first:** `docs/chapter-6-to-8/watch.html` has silent recordings of Chapters 6, 7 and 8 (True Ending route). You can see every Chapter 8 scare before you play it.

## 3. What can scare you in Chapters 6 and 7 (random, tension-driven)
Source: `src/horror/Encounters.ts`, `Jumpscares.ts`.
| What | When | What it is | Dangerous? |
|---|---|---|---|
| **Matron doorway glimpse** (`matron-doorway`) | Chapters 6 to 8, only in an **unlit** room, tension ≥ 0.45, at most once every 160 s | The Matron stands about 4 m away facing you. If you look at her for ~1.4 s there is a sting and she vanishes; otherwise she fades after ~14 s. | No chase, no touch. |
| **Chapter 7 radio voice** (`matron-night`) | **Once**, about 22 s after Chapter 7 begins, when you are in a room | The living-room radio switches on, a low swell, and her voice: "Leave the evening alone, Daniel. It is an old dark thing, and you will have to carry it for ever." | A voice and a sound swell. She does not appear. |
| **Hollow** (`hollow-stalk`) | Chapters 4 to 8, dark living/dining/kitchen/study/Daniel's room, tension ≥ 0.5 | A figure far away that hops toward you. Shine the flashlight (**F**) on it and it vanishes. If it reaches you your torch dies for ~2.6 s and it vanishes. | Not lethal. |
| **Doorway-behind / face-in-dark / corridor-run / matron-behind** | Chapters 3/5 to 8, with long cooldowns (260 to 320 s; "matron-behind" happens once) | A figure where you just walked, a pale face in a dark room, something running at the end of a corridor, her behind you in a lit passage. | Each is a few seconds and harmless. |
**Safe habits:** keep rooms lit with the wall switches, stay in lit rooms when you want a calm moment, and pause with Esc whenever.

## 4. CHAPTER 6: ELEVEN YEARS AGO (you have finished this; here for review)
Objective text (no steps): "Find out what your family did afterwards. Somewhere in the house there are things they packed away." Starts right after the Chapter 5 voice-comparison puzzle (and the dark walk that follows it). Completes when you collect **Mum's letter to Dad**. **No puzzle in Chapter 6.** (The reconstruction puzzle is Chapter 7.)

1. **Brass key.** Kitchen, along the north wall: the **third base cabinet from the west** (just east of the cooker) has a **front drawer**. Open it, **"Take brass key"** ("tagged 'Landing'"). [Row position computed from the code: cabinets at x = 8.6 + 0.6·i; the key drawer is i = 2, so x ≈ 9.8.] Hint on the way: the shopping list on the kitchen fridge door says "batteries (torch!)".
2. **Storage room door** (landing, north end): "Door (locked)" → **E** with the key in your pack: "The brass key turns. The storage room door unlocks." The key is not consumed.
3. **Switch on the light** (wall left of the doorway inside).
4. **Batteries**: top shelf of the north shelving, "Take batteries" (needed for Chapter 7's answering machine).
5. **Suitcase**: on the floor in the east half of the room (about x 7.45, z 10.1); prompt **"Open suitcase"**. The lid opens and stays open, showing **five papers**:
   | Paper (prompt "Examine letter/…") | Evidence | Required? |
   |---|---|---|
   | Mum's letter to Dad ("Rick - … He was there. He was in the house the whole time.") | `anna-letter` | **Required** (ends Chapter 6) |
   | Order of service ("Emily Rose. Ever so loved. Ever so missed.") | `funeral-card` | Optional |
   | Mum's letter to Daniel, never sent ("You were thirteen…") | `anna-unsent` | Optional |
   | Bank statement, standing order "HOUSEKEEPING" | `house-statement` | Optional, **motive clue** |
   | Parish office letter about the disturbed plot | `parish-letter` | Optional, **motive clue** |
6. **Emily's note on the dresser** (Emily's bedroom, on the dresser) is the third motive clue (`emily-room-note`); it is optional and not in this room.

**WHAT TO EXPECT:** quiet reading. A memory ("They never asked me. So they never knew.") surfaces in the journal when Chapter 6 starts.
**SCARE WARNING:** no scripted scare. Random glimpses from section 3 can occur on the landing or in the dark storage room before you switch the light on.
**SUCCESS CHECK:** reading the letter: "Evidence added: Mum's letter to Dad (never sent)"; **Chapter 7** card.
**Missable?** No. All suitcase papers stay in the case; you can return until you press Check in Chapter 7's puzzle's successor, i.e. until Chapter 8's hunt begins (see section 8).

## 5. CHAPTER 7: THE MISSING NIGHT (your current chapter)
Full list is Step A to E above. Extra detail:
- **Required for the puzzle:** `kitchen-note`, `emily-recorder`, `machine-msg3`, `phone-bill`, `anna-letter`.
- **Optional here:** answering machine **messages 1 and 2** (`machine-msgs12`).
- **Journal deduction that appears when it is solved:** "The evening has an order now. An hour of it was never written down, and Daniel was in charge of it."
- **Memory that surfaces at the start of Chapter 7:** "I called for help the moment I could." (m6). It is contradicted by the answering-machine message 3 and the telephone bill.
- **Encounters:** the radio voice (once), plus the random ones in section 3. **No chase.** **No timed sequence.** **Pause any time.**

## 6. CHAPTER 8: THE LAST DOOR
Everything below is in `Finale.ts`, `Endings.ts`, `Chase.ts`, `Struggle.ts`. The recorded footage of the True route is in `docs/chapter-6-to-8/`.

**6.1 Before the mirror: you can still collect things.** After the chapter card the HUD says "The bathroom light is on. Something is waiting in the mirror." Nothing is forcing you yet; you can walk the house and collect optional evidence. **Exception:** in the **foyer or hall**, Chapter 8 has a "**Matron by the front door**" scene: she can appear at the door (about x 5.7, z 1.0), and if you come within ~3 m she says: "You may leave whenever you like. Say it was an accident, and the door will open." She does not move toward you and leaves when you walk away from the foyer/hall. **SCARE WARNING:** appearance, voice, no chase.

**6.2 Mirror sequence.** Enter the **bathroom** (upper floor, east of the landing; door on the landing's east wall at about z 8). **SCARE WARNING (major, scripted, roughly a minute):** Daniel's controls lock; a cinematic bathroom mirror where the **reflection starts as Daniel, then lags, then moves by itself, its head tilts, the neck stretches, it comes to the glass with raised hands and an open mouth, a white flash, a loud sting**; then voices (`fin-mirror`). It cannot hurt you. **You can press Space/Enter to skip it.** It sets `seen:mirror`, which you need for the best ending. The game **autosaves** afterwards.
- **SUCCESS CHECK:** objective "She has stopped pretending. Get to Emily's room upstairs. She will not follow you into lamplight."

**6.3 The hunt.** **SCARE WARNING: chase-like, repeatable.** The house goes dark except the **dining room** (lit; she will not enter lit rooms), and the Matron appears **at least three rooms away** and walks toward you at a slow pace (about 1.05 to 1.35 m/s) opening doors; a heartbeat quickens as she nears. If she reaches you (1.35 m) the screen whites out, you wake in the **lit dining room**, your torch is dead for about 3.5 s, and she speaks; she then comes again after ~14 s, **until you are in Emily's room**. She never kills you in the hunt. **Route:** you start upstairs in the bathroom, so go **bathroom door → landing → Emily's door** (west wall of the landing at z 7.5, "first on your left" from the stairs top → room x 0 to 5, z 6 to 11). This is a short walk; the hunt ends the moment you are in Emily's room. **Safest:** stay in a lit room if she appears and wait for her to leave, then continue.

**6.4 Emily's room (the "reconstructed room") and the confrontation.** **SCARE WARNING (scripted, controls locked):** a dim room, **Emily's small body under a sheet on a bed (her hand and a ribbon are visible; no gore)**, voices, a stinger, a lamp flicker, then **the Matron stands in the doorway behind you** and Daniel turns to her. Three **choice rounds** follow (see section 7). `seen:body` is set here.

**6.5 Transformation (only if you refuse her in the last round).** **SCARE WARNING (major, scripted, 21 seconds):** the Matron's **true form**, in full, with a lamp strobe and sounds; then the room comes apart.

**6.6 The chase.** **SCARE WARNING (major, interactive).** You are back in Emily's real room upstairs; the HUD says **RUN**. She throws the door open and chases you after a **~5 s head start**. She cannot cross lamplight: the **foyer, living room and study keep a lamp lit** (the hall sconce lights once you are in a lit room). Lamps fail now and then **with a buzz and a flicker about a second before**; only one is out at a time and it returns after ~11 s. A red vignette and a heartbeat grow as she nears. **Pause with Esc any time.**
- **If she grabs you:** control is taken and a **10-second struggle** starts. Press the **arrow shown** (arrow keys or WASD), five in a row. A wrong key costs progress; a slow answer costs progress (2.4 s per arrow); don't mash. Breaking free throws her off for ~2.6 s and the chase goes on; a new grab starts a fresh 10 s. **If the 10 seconds run out the chase ends in Denial or Recognition** (section 7). Esc pauses the clock.
- **How to survive:** run (Shift+W) down the stairs to the **foyer** (lit); you cannot be grabbed in a lit room. This is the objective flow:

**6.7 The front door puzzle (True Ending path).** The HUD guides you one step at a time (each step names the object, not the answer):
1. **TRY THE FRONT DOOR** (foyer; "Something is on the other side.").
2. **FIND WHAT HOLDS HER TO THE HOUSE:** look at the **family photograph in the living room** (west wall): it shows a **fifth figure**. E ("Look at the photograph").
3. **FIND THE ORIGINAL PRINT:** the **photo album in the study** holds the same photograph with four people only. E on the print ("Take the original print out of the album").
4. **PUT THE TRUTH WHERE THE LIE HANGS:** back in the living room, E on the framed photograph again: "Replace the photograph with the original print."
5. **SCARE WARNING (short):** her cry, every lamp fails at once, a white flash, then silence.
6. **OPEN THE FRONT DOOR** (foyer, E). **WALK OUT.**
- If you are stuck, the HUD gets plainer after about a minute (and the house map rings the living room/study). Safe rooms: foyer, living room, study (lit) while you work.

**6.8 The True Ending, credits, post-credits.** Daniel walks out into dawn; end card; **credits**; then **a silent telephone scene** (the phone rings in the empty house; nobody speaks).
> **SCARE WARNING (the strongest in the game, True Ending only):** after the telephone scene there is **a short silence, then the Matron's transformed face appears extremely close to the screen with a sudden vocal sting, a cut to black, "BYE BYE.", then the main menu.** If you want to see it safely: **lower Effects volume or Master volume before the credits end, turn on both reduced-scare options, or watch the recording instead** (`docs/chapter-6-to-8/CHAPTER_8_THE_LAST_DOOR.mp4`, silent).

## 7. The endings: exactly how they are decided
(`src/story/Endings.ts`, `Finale.ts`; matches `docs/ENDINGS.md`.)

**Two facts the game works out from what you have done**
- **responsibility** = you solved the night reconstruction **and** at least **4 of Daniel's 6 false memories** are doubted or refuted (the journal's **Memories** tab; one contradicting piece of evidence makes a memory "doubted"). With the required evidence above you have all six at least doubted.
- **understandsMatron** = the voice comparison is solved **and** you have seen the body (automatic in 6.4) **and** the mirror (automatic in 6.2) **and** you hold **at least two** of: bank statement, parish letter, Mum's note on the dresser.

**The three questions (you choose with the number keys or clicks)**
1. *Offer round.* "Take me to her room." → **Denial now.** "I don't know what happened." → next round. "That isn't what happened." (only offered if `responsibility`) → next round.
2. *Comfort round.* "Stay." → **Denial.** "I did this. I'm sorry." (only if `responsibility`) → next round. "I can't look at it." (offered only if you do **not** have responsibility) → **Denial.**
3. *Plan round.* "Then it's mine to carry. Let it end here." → **Recognition.** "No. But you don't get to decide what I do with it." (only if `understandsMatron`) → **the chase.**

**So**
- **True Ending:** answer "That isn't what happened." (or "I don't know what happened.") → "I did this. I'm sorry." → "No. But you don't get to decide…" → survive the chase → front-door puzzle → open the door. (The automated player uses refuse, own, refuse.)
- **Recognition Ending, two ways:** (a) ... → "I did this. I'm sorry." → "Then it's mine to carry. Let it end here." (no chase). Or (b) answer honestly all the way (Offer "That isn't what happened." / Comfort "I did this." / Plan "No…") and then **let the Matron hold you for the full 10 seconds** in the chase.
- **Denial Ending:** "Take me to her room." (immediately); or "Stay." / "I can't look at it."; or refuse her but get caught after having evaded (any earlier "unsure", "Take me to her room", "Stay", "I can't look at it") or without having said "I did this."
- **What each shows (warnings):**
  - **Denial: the most graphic scene.** Daniel says "Please... take me with my family." The screen goes black and it is heard; then **Daniel's body on the floor in a pool of blood with severe injuries** (the one graphic image in the game); the Matron's ritual (dark threads); **Emily's preserved body sits up with black eyes, the head on one side and a smile held too long**; her voice ("It was never going to be Emily who got up."); she walks to the front door, which opens for her. Credits. Skip with Space if needed. No post-credits scare.
  - **Recognition: mild.** Dawn, Daniel leaves, one upstairs window is lit and she stands behind it. Credits. No post-credits scare.
  - **True: see 6.8** (the only one with the post-credits sting).
- **Can I see all three?** Yes: three saves or replays from the Chapter 8 mirror autosave (the game autosaves after the mirror). I did not test loading that save to replay endings in your build. **[unverified]**

## 8. What is missable
- Everything in Chapters 6 and 7 (suitcase papers, answering machine, desk drawer, Emily's note) can be collected **at any time until the confrontation** in Chapter 8. The confrontation (6.4) reads your evidence at that moment. **After the hunt starts** the Matron repeatedly chases you, so finish collecting **before you enter the bathroom** in Chapter 8.
- **Permanently missable:** the one-time Chapter 7 radio voice and the one-time "Matron behind you" scare, if you were not there. They add atmosphere only; no ending depends on them.
- **Ending-relevant evidence:** `album-print`, `emily-recorder`, `machine-msg3`, `phone-bill`, `anna-letter` (memories and the reconstruction), `tape-analysis` (the voice-comparison solution), and **two of** `house-statement`, `parish-letter`, `emily-room-note` (for the True Ending).
- **Optional evidence worth taking (journal only):** the calendar and shopping list (kitchen), the pulled-out chair (dining room), Emily's drawings, teddy, reading chart, Santa letter and the siblings photograph (Emily's room), Daniel's homework and school photograph (Daniel's room), the Christmas tape (living-room cassette player), Dad's dictaphone and the birthday tape (study deck), the funeral card and Mum's unsent letter (suitcase).

## 9. Using Observer Mode instead of playing
- **Only in development** (it is not in the website). In a terminal: `npm run dev -- --port 5173` and open one of these, then press the highlighted **Play** button (muted by default; add `&audio` for sound):
  - True: `http://localhost:5173/?demo&timer&ending=true`
  - Denial: `http://localhost:5173/?demo&timer&ending=denial`
  - Recognition: `http://localhost:5173/?demo&timer&ending=recognition`
  These start at the Chapter 8 checkpoint (after the mirror) and play to the ending; I ran all three in earlier passes (True most recently, today). It makes the choices for you; **Daniel is never teleported and no flags are faked**. Keep the browser tab in the foreground.
- **Chapters 6 and 7 cannot be played from a checkpoint.** The whole-story Observer route exists (`?demo&timer`, about 28 minutes) but I have **not** rerun it for this document.
- **Safest of all:** `docs/chapter-6-to-8/watch.html` (silent recordings of Chapters 6, 7 and 8 and one 16-minute video).

## 10. Things I could not verify
- Your save: what you hold, whether you have batteries or the telephone bill. (Use the journal Timeline.)
- Prompt wording for the study desk drawer and the storage light switch.
- Exact in-game wording and sounds I describe as "stings"; I have not listened to any audio.
- Loading the Chapter 8 autosave to replay other endings.
- That the settings reduce a particular sound by a particular amount (they are wired in code as described).
