# Matron true form and entity identity audit

Phase 7 has not been started. Story, dialogue, voices, endings, chapter order, save format and Observer Mode are unchanged. No
dependency or asset was added. Typecheck is clean; the production build succeeds and `dist/` has no showcase, Observer or
capture code. Screenshots: `docs/matron-true-form/` (21 PNGs, 1600 x 1200, all opened and inspected).

## 1. Entity identity audit
**Result: no label or model was wrong in the code.** Checked against the constructors and the capture code:

| Entity | Class | Builder | Capture subject | Look |
|---|---|---|---|---|
| Matron | `Matron.ts` | `models/MatronModel.ts` | `matron` | green dress, cameo, ruff, keys |
| Witness | `Witness.ts` | `models/WitnessModel.ts` (built twice: the figure and its afterimage) | `witness` | amber coat, hat, hidden face, a photograph |
| Hollow | `Hollow.ts` | `models/HollowModel.ts` | `hollow` | charred ash figure, open chest, trailing soot |
| Unremembered | `Unremembered.ts` | `models/FragmentModel.ts` | `unremembered` | pale figures cut into separated slices |

**The pale, clearly sliced humanoid is the Unremembered**, as suspected. The sliced design exists only in `FragmentModel.ts`; the Witness
model contains no slicing, and the Witness's only translucent part is its own cyan-to-grey afterimage (a second copy of the same
coat and hat, shifted sideways), which can be mistaken for something else in a close-up. The two are shown side by side by name:
`witness-with-photograph.png` / `witness-full-for-identity.png` (amber coat, hat, hidden face, a real four-person photograph) and
`unremembered-sliced.png` (pale, separated slices). Nothing was changed in either design.

## 2. The Matron's four states (one model, a rig; no extra models)
The stage still comes from the story (`Corruption.ts`: the exposed tape, the funeral card and motive clues, the confrontation). This
pass redesigned what each stage looks and moves like.
1. **The composed woman:** unchanged: the green dress, cameo, ruff, keys, a composed, almost reassuring older woman.
2. **The unsettling woman:** her **gaze locks on Daniel and does not break**, even when her head turns away (her eyes counter-rotate to hold it); a faint smile held too long that arrives quickly and leaves slowly and does not follow her words; slow, independent eye drift; and **every so often she goes perfectly still for too long** (about 1.5 to 3 s, every 6 to 13 s).
3. **The unmasked woman:** taller, a longer, leaning neck, uneven longer arms, a tilted head, larger eyes, grey skin, a dragged-down expression, loose hair; her head arrives in small exact jumps; the face periodically **slips against the skull**.
4. **The true nightmare, "the Tall Mother".** One coherent design, not a pile of effects:
   - **Silhouette:** too tall (about 30% taller) and too narrow (the dress becomes a tall, narrow column).
   - **Neck:** a crane neck nearly three times as long, leaning forward out of the ruff, with the head cocked almost onto its shoulder.
   - **Head:** it moves on its own rhythm, independent of the body, and the skull is lengthened and narrowed.
   - **Arms and hands:** arms to the knees with long hands, no longer clasped; they hang with the fingers pointing down.
   - **Face:** black voids for eyes, one of which squints on its own while the other stays wide; a mouth whose expression **swings between a wide grin and a grimace** and gapes, with no ordinary logic; grey skin.
   - **Hair and body:** long loose hair streaming from the head; a slow sway.
   She keeps her dress, cameo, ruff, keys and hair, so she is recognisably the same woman whose maternal presentation has stopped being held. It is a distinct silhouette even with no light at all (`matron-final-silhouette.png` against `matron-composed-silhouette.png`).
- **In the house and the chamber she stoops** rather than clip the ceiling (2.7 m in the house, 2.42 m in the chamber): she folds forward from the neck and is slightly squeezed. In a corridor this makes the form better, not worse (`matron-final-hallway.png`).
- **Her story facts are untouched:** she is the same entity with the same motives; the design makes no claim that she is, or becomes, Emily.

## 3. Changes beyond the model
- `models/MatronModel.ts`: the neck is now a joint chain (body, neck pivot, head anchor, head), so the neck can stretch and lean and the head can roll, turn and nod on its own; hands and arms are rigged; the rig has a per-frame `tick(dt, talk, gaze)` and a `post()` that applies lean and sway after the body's own animation.
- `Matron.ts`: passes Daniel's relative direction to the rig, applies the rig after the idle and walk code (which had been zeroing the lean), and stoops under a ceiling.
- `models/Head.ts`: a wider smile and grimace range.
- **`world/Stage.ts` and `core/Game.ts`:** the chamber's lamp is restricted to the room's own meshes so it cannot leak into the house; that left the Matron **an unlit silhouette** in the confrontation. The lamp now lights her (one new method, `Stage.include`). This is the only change to existing game behaviour.
- `dev/showcase/Showcase.ts`, `vite.config.ts`: capture tooling only (development server only).

## 4. Screenshots (`docs/matron-true-form/`)
States: `matron-state1-full/face/hallway.png` to `matron-state4-full/face.png` (and `-hallway.png` for 2 and 3). Final form: `matron-final-front.png`, `matron-final-side.png`,
`matron-final-threequarter.png`, `matron-final-silhouette.png` (and `matron-composed-silhouette.png` for comparison),
**`matron-final-hallway.png` and `matron-final-chamber.png` in the real house and the real chapter-8 chamber** (the real player camera and torch;
in the chamber Daniel stands 2.4 m from the doorway instead of the finale's 1.5 m so the whole figure fits).
Identity: `witness-with-photograph.png`, `witness-full-for-identity.png`, `unremembered-sliced.png`.

## 5. Performance
No new models and no new textures. The rig is a handful of transform and material assignments per frame; the mouth and smile morphs move a
few hundred vertices only when their value changes. The Matron is about 68,000 triangles (unchanged). Real-Mac performance is unmeasured.

## 6. Limitations (not hidden)
- The motion (gaze lock, the held stillness, the independent head, the grin/grimace swing, the sway) is animation: **only the poses are in the screenshots, and I have not watched it move.**
- The face in the true form is the same sculpted face stretched and twisted; it reads well from a distance and in the corridor, but it is still a stretched version of the original head, not a new face.
- The streaming hair is made of stiff strands; it reads as a mass of hair at a distance but looks like wires up close.
- The long neck is a smooth tube; it has no muscle or skin detail.
- Squeezing her to fit the chamber ceiling shortens the arms and body, so the tallest proportions are only seen in open space.
- The progression was verified in forced-level screenshots; I did not play to the confrontation, so the in-game timing of the transformation (about 3 s per step, faster into the last) has not been seen in a real run.
