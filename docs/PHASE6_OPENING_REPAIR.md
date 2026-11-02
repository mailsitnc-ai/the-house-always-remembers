# Phase 6 opening repair

Phase 7 has not been started. No audio was generated or changed, no packages were added, no voice credits were used. Canon,
the approved opening line, the three endings and their thresholds are unchanged.

## What went wrong (verified in the code, not assumed)
- **The entity was the Witness**, not the Matron. It is the amber, hatted, coated figure holding a small photograph. The Matron
  is tall, in a green dress, and first appears in chapter 5.
- **Why so early:** the Witness stood guard over the living-room photograph, and the rule for it was "chapter 2 or later, player in
  that room, evidence not yet found". The moment Daniel walked into the living room it appeared, four metres from the photograph
  it was supposed to be guarding, with a letterboxed camera turn toward it.
- **Dialogue that fired prematurely:** its first-sighting thought, "That's the photograph. The one in her hands. Where did she
  get it?", played before the player had been given a chance to look at any photograph. It referred to the figure's own small
  photograph, which sounded like the one on the wall.
- **Why the photograph felt impossible to inspect.** The photograph itself was never broken: it is a pickable, correctly registered
  target, its prompt appears, and E opens a large inspection view. The real causes were:
  1. The guided camera turn for the Witness pulled the view away from the photograph, and nothing ended it when inspection began.
  2. The inspection image for portrait photographs was taller than the view at inspection distance, so heads were cropped.
  3. Invisible furniture colliders were pickable and could block the interaction ray.
  4. If the player skipped the opening early (Space or Enter), the opening photograph overlay could appear after the skip and stay
     on screen over the game. This is a race in the overlay loader, and it is the most likely reason a photograph appeared on
     screen but could not be used.
  5. Opening a second inspection while one was open leaked the first object onto the camera.
  6. The player was told nothing about what to do: the old objective said only "Look through the ground floor", and was replaced at
     each chapter start.

## What changed
- **Objective system** (`story/Objectives.ts`): one current objective at a time, derived from what the player has done (flags and
  evidence), so it is also correct after loading a save. It shows as one quiet line, brightens when it changes, and is in the
  journal's new **Objective** tab with the steps already done. No waypoints or markers.
  Opening steps: *the lights are on, start with the living room* → *a family photograph hangs on the living room's west wall,
  look at it closely* → *look through the rest of the ground floor and read what the family left* → (chapter 3) *something moved
  upstairs, find Emily's room* → (if the Witness was seen) *someone stood in Emily's room facing her tape recorder, look at what it
  was looking at* → *look through Emily's room and listen to what she recorded*. Later chapters use their existing objectives, and
  the finale sets its own.
- **The photograph:** the objective names the real, interactable photograph and where it is. Inspection ends any guided camera,
  never leaks, closes reliably with E, and a safety net closes it if the game leaves the inspection view. Portrait photographs are
  sized to fit the view. Invisible furniture colliders no longer block the ray (walls still do). The photograph is only marked as
  found when the player examines it.
- **Dialogue gating:** nothing in the opening refers to a photograph before it has been examined. If the player lingers in the
  living room (35 s), a thought nudges them toward the photograph; at 80 s the objective is highlighted again. The old premature
  line is gone, and no random disturbances or scares run until the photograph has been examined.
- **Stage D, first disturbance:** after the photograph, ten seconds later, a few quiet footsteps on the floor above and
  "Someone is walking upstairs." At the start of chapter 3, a door creaks upstairs and a light dips.
- **Stage E, first sighting:** the Witness no longer appears in chapter 2. Its first sighting is in chapter 3, in Emily's room,
  across the room (never closer than 3 m), by the tape recorder it guards. Daniel only describes what he sees ("a hat, a long
  coat, something held to its chest. It isn't looking at me"). When it fades he thinks "It was looking at that little recorder."
  The Unremembered's whispering no longer starts on top of this; it waits until the Witness has been seen and gone.
- **Witness versus Matron:** the Witness is amber, silent, holds a photograph and faces the evidence. When the Matron first appears
  in the hall (chapter 5), Daniel thinks that this is not what he saw by the recorder: that one was not looking at him, this one is.
- **Opening overlay race** fixed in `ui/StoryUi.ts`.

## Tests (silent unless stated)
Typecheck clean; production build succeeds. In the engine, from a fresh game:
- objective sequence living → photo → ground floor; 120 s of game time in the living room without touching the photograph produced
  no Witness, no scare, no disturbance, only the 35 s hint thought and the 80 s objective highlight;
- E on the photograph registers the evidence once, opens the inspection view, a second E closes it, nothing stays on the camera,
  and a second photograph can be opened and closed;
- **visually checked in the browser:** the inspection view shows the whole five-figure photograph, readable, with its caption;
  after an early skip the opening picture no longer sticks on screen; the Witness is seen across Emily's room, amber and clearly not
  the Matron;
- footsteps overhead followed the photograph by ten seconds; chapter 3 objective "find Emily's room", then the watcher objective
  after the sighting;
- save at chapter 3 with the Witness seen, reload, Continue: objective, journal Objective tab, position and flags are correct;
- no console errors.

## Remaining problems
1. The Matron's first appearance in chapter 5 was not re-staged beyond the new thought; its pacing is unchanged and has not been
   hand-played.
2. A Witness that is on screen when the player saves will simply reappear after loading (without the camera turn).
3. Frame times in the embedded pane (about 1 fps for the new scenes) are not meaningful; real-Mac behaviour is unmeasured.
4. The first, most likely cause of what you saw (the stuck opening picture) was reproduced by skipping the opening quickly; I did
   not manage to reproduce the other reported symptoms any other way, so please try the opening again by hand.
