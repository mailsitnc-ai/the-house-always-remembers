# Progressive horror transformation report

Phase 7 has not been started. Story, canon, dialogue, voices, chapter order, puzzles, evidence requirements, endings, save format
and Observer Mode logic are unchanged. No dependency or asset was added. Typecheck is clean; the production build succeeds and
`dist/` contains no showcase, Observer or capture code. Screenshots: `docs/progressive-horror/` (35 PNGs, all opened and inspected).

## 1. How it works
**One level, derived from the story.** `src/horror/Corruption.ts` computes a stage from what Daniel has found and done, using the
existing evidence and flags. There is no timer and nothing new in the save, so it is correct after loading a save, never goes down,
and works in Observer Mode (which plays through the real story).

| Stage | Matron state | Trigger (any of) |
|---|---|---|
| 1 | The composed woman | nothing in the house has yet contradicted her |
| 2 | The uneasy woman | two false memories doubted, or the "Emily" tape exposed (voice puzzle solved) |
| 3 | The unmasking | the funeral card (Emily's burial), the first motive clue (the house kept, the plot, Emily's room), the mirror scene, or four memories doubted |
| 4 | The true form | the confrontation in Emily's room: the chamber scene and the body seen |

The HorrorDirector polls the stage twice a second and eases a continuous level (0 to 3) toward it, about 3 seconds per step (faster
into the last), so a change is seen, not popped. A loaded game snaps to its level. All four entities read the same level.
I checked the derivation in the engine: stage 1, then 2 on the exposed tape, 3 on the funeral card, 4 at the confrontation, and the
level reached 3 after 10 s. **I did not play the story to each trigger; the screenshots force the level (development tool only).**

## 2. What each entity does at each level (no extra models: morphs, materials and animation)
- **Matron.** One model, a rig of cheap transforms and material changes, plus a mouth-corner morph and a bundle of loose hair that is hidden until needed.
  - **State 1:** unchanged.
  - **State 2:** her eyes wander slowly and independently, a faint smile is held too long (it arrives fast and leaves slowly, and does not follow what she says).
  - **State 3:** her silhouette is wrong: taller, a longer neck, longer unequal arms, a tilted head, slightly larger eyes, greyer skin; her mouth is slightly open and her expression drags down; hair has come loose; her head no longer glides but arrives in small exact jumps; the face periodically slips against the skull, as if the mask were struggling to hold.
  - **State 4:** a very long neck, arms about 50% longer and hanging apart (the clasp is gone), black eyes, a held open mouth with a tremor, ash-grey skin, a darker dress, long loose hair. In the low chamber she **stoops** rather than clip the 2.5 m ceiling.
  She is the same woman throughout (same hair, brows, dress, cameo, keys).
- **Witness.** The amber coat, hat, hidden face and photograph are kept; it never approaches. Its movements get less natural (the afterimage slips more often and further, the body is a slightly different shape at each slip, the head twitches), the cyan afterimage grows from 38% to about 75% strength, and the photograph is lifted, little by little, to where its face should be, with a shaking hand.
- **Hollow.** The hollow chest and trailing lower body are kept. Three masks of incompleteness (made on first use): the chest hole grows, gaps open in the flanks and shoulder, the hem tears further; the figure grows taller, its head stretches and turns, the hand goes, then the whole left arm, the soot reaches further, and it fades slightly. Late, it is hard to interpret.
- **Unremembered.** Four prototypes per variant, made on first use. **Early:** a clean, recognisable child with slightly displaced slices. **Middle:** misaligned slices, some missing. **Late:** large shifts, shear and twist, a third missing, the silhouette hard to reconstruct. **Finale:** half the slices missing, a strong lean, a stretched fragment. It stays a child-sized incomplete memory with no face, never a monster, and never Emily.

## 3. Performance and safety
No new models: the Matron adds one loose-hair mesh (26 thin strands), the Hollow two extra 512x256 masks and the Unremembered three extra
sets of prototypes, all created only when first needed. Per-frame cost is a handful of transform and material assignments; the jaw and smile morphs move about a
hundred vertices only when their value changes. No continuous mesh deformation. Collisions, triggers and the existing behaviours are untouched. Real-Mac performance is unmeasured.

## 4. Screenshots (`docs/progressive-horror/`)
- **Matron, four states:** `matron-state1-full/face.png` to `matron-state4-full/face.png`; in the hallway `matron-state1-hallway.png` to `matron-state4-hallway.png`; stage 4 in the real chamber `matron-state4-chamber.png`.
- **A transition (stage 2 into 3):** `matron-transition-2to3-a.png` to `-d.png` (levels 1.0, 1.35, 1.7, 2.0).
- **Witness:** `witness-early-full`, `witness-middle-full`, `witness-late-full`, `witness-early-closeup`, `witness-late-closeup`, `witness-late-room`.
- **Hollow:** `hollow-early-full`, `hollow-middle-full`, `hollow-late-full`, `hollow-late-head`, `hollow-late-living`.
- **Unremembered:** `unremembered-early-full`, `-middle-full`, `-late-full`, `-finale-full`, `-early-closeup`, `-finale-closeup`, `unremembered-finale-room`.
All use the game's own models and materials; the hallway, chamber and room shots use the real player camera and torch.

## 5. Limitations (not hidden)
- State 4 is a **morph of the same human-shaped model**: stretched, black-eyed, open-mouthed and loose-haired. It is frightening in the chamber, but it is not a radically inhuman form.
- The loose hair is built from stiff, regular strands that look a little like wires up close; the strands cross the face slightly less now but not never.
- The progression was verified in screenshots at forced levels and by checking the derivation in the engine. **It was not played through a real run, the finale, the Observer route, or a save and load.**
- The Hollow late state is so incomplete that it is easy to lose sight of; the Unremembered finale state is very faint and sparse in a dark room.
- Matron's state 2 is deliberately subtle: its eye wander and lingering smile are animation, so they are only partly visible in a still image.
- Real-Mac performance is unmeasured.
