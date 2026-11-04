# Visual art overhaul report

Phase 7 has not been started. No story, canon, chapter order, evidence, puzzles, dialogue, voices, endings, entity behaviour,
save format, accessibility settings or Observer Mode logic was changed. No audio was generated, no dependency or asset pack
was added, and Blender is not required. The old screenshots in `docs/entity-reference/` were kept for comparison.

**Honest summary:** every entity is now a designed, sculpted figure rather than a set of primitives, and the Matron and
Emily's chamber in particular are a large step up. None of them is final-quality character art. What is left is listed under
"Limitations". The build passing says nothing about the look; the look was judged by opening every screenshot.

## 1. What was wrong with each original model (from `docs/entity-reference/`)
| Model | Problem |
|---|---|
| Matron | A lathe dress and tube arms, a white featureless mask with two dark holes, a nose bump and a line for a mouth. No fabric structure, no hair detail, no hands. |
| Witness | A coat built as one smooth lathe, a hat as two cylinders, a **blank grain-textured rectangle** for the photograph, limbs as tubes. The cyan afterimage did most of the work. |
| Hollow | One flat black silhouette of tubes and an ellipsoid head. No depth, no surface, nothing "missing". |
| Unremembered | Flat paper planes with a stencil painted on them. |
| Emily's body | Four stacked ellipsoids ("a snowman") under no cloth, a hand made of separate ovals, a ring for the ribbon. |

## 2. What was redesigned
A small procedural-sculpting toolkit was written (`src/horror/models/Sculpt.ts`): displaced parametric grids with welded
smooth normals and vertex colours, swept limbs with wrinkles, a jointed hand, value noise. Everything is plain vertex data.
All models use the existing Babylon `StandardMaterial`; no new engine features.

- **Matron** (`models/MatronModel.ts`, `models/Head.ts`): a tall woman of about sixty in a dark-green wool dress. Box-pleated
  skirt with bustle, hem band and fold shading; seamed, buttoned bodice with a cameo; stand collar and a lace frill; belt and
  buckle; sleeves with elbow bends and lace cuffs; **clasped, jointed hands**; a ring of house keys on a strap at her belt (a
  decorative addition, not a canon claim); hair drawn back from a centre parting with a **ragged natural hairline** into a
  braided bun. **A sculpted face**: brow, eye sockets, nose with wings and nostrils, cheekbones and age hollows, philtrum, lips,
  chin, ears. The skin is baked at 768x384 from the same feature functions plus fine lines (crow's feet, forehead, lip creases,
  pores). Pale clear eyes with a textured iris, lids, thin grey brows. Subtly inhuman by design: she is 2.36 m, the neck and
  arms are a little long, the skin is evenly waxy, the eyes are slightly large and never blink. **Mouth**: a real slit with a
  dark inside and teeth, driven by a jaw morph; closed at rest, opens with her voice.
- **Witness** (`models/WitnessModel.ts`): a cut and creased overcoat with a centre seam, buttons and an upturned collar; a
  constructed fedora (pinched crown, hat band, drooping brim); face lost in the shadow under the brim; sleeves with creases;
  trousers and shoes; the **grain dissolve, amber tone and cyan afterimage are kept**. The photograph is a **real painted
  photograph** (the four-person family print, from the existing photo painter) on a paper card, held in a modelled hand.
- **Hollow** (`models/HollowModel.ts`): a stooped, long-armed man-shaped absence of charred ash-grey cloth. **The chest is cut
  open and so is the back, so the room shows through it**, with torn edges (a smooth alpha mask) and a ragged hem; the face is
  smoothed over with only a faint brow, nose and a rift; one whole hand, one coming apart into strands; below the hips, soot
  trailing to the floor. Cold rim light.
- **Unremembered** (`models/FragmentModel.ts`, `horror/Unremembered.ts`): no longer flat. Each is a small person built from
  volumes (a child from behind, a hem and two legs with a floating hand, a stretched figure with raised arms), **cut into 2 cm
  slices, each shifted sideways, some missing**, so there is a body a torch can find that never resolves into a person. Pale,
  cold, translucent, lit. Distinct from the Hollow (black, large) and the Witness (amber).
- **Emily's preserved body** (`world/EmilyShroud.ts`, `world/Stage.ts`): a child's body laid on her back, built from overlapping
  volumes with child proportions (head, nose, brow, chin, neck, shoulders, chest, belly, hips, thighs, shins, feet, arms at her
  sides), under a **linen sheet modelled as a draped height field**: it tents over the shoulders and knees, sags between, falls
  over the mattress edge, is creased, and yellowed and dusty at the edges. The head is veiled by the same cloth. **One small
  jointed hand lies on the sheet with a faded rose ribbon bow at the wrist.** Lavender lies beside her. Non-graphic: nothing of
  her is shown but the shape and the hand. She does not move or breathe.

## 3. Geometry, materials and animation improved
- Geometry: sculpted/displaced grids instead of primitives; real hands; hair and brows; the Hollow's open chest; sliced volumes.
- Materials: vertex-colour ambient occlusion in folds; a baked face skin texture; **alpha-masked hair and torn edges** (not stepped
  meshes); a painted eye; linen, wool and ash with distinct specular and rim response.
- Animation: **mouth movement is now a jaw morph** driven by the existing speech level (`Matron.speak`), plus the existing arm
  lift and head tilt. Head turn, walking and cinematic behaviour are unchanged. The Witness's lowering arm now pivots at the
  shoulder. The Hollow's frame-skip glitch and the fragments' stutter are unchanged.

## 4. Performance (embedded browser only; the real Mac is unmeasured)
| Model | Triangles | Notes |
|---|---|---|
| Matron | about 68,000 (36k vertices, 30 meshes) | Reduced once from 94k. Textures: face 768x384, hair and mask 512x256 each, dress 256 (and its normal map), eye 256x128. Build about 0.3 s at start. |
| Witness | about 19,000 (and the same again for the afterimage while visible) | Build about 25 ms each. |
| Hollow | about 17,000 | 29 meshes, one 512x256 mask. |
| Unremembered | about 4,800 per fragment, usually 2 to 3 on screen | Prototypes are cloned (shared geometry). |
| Emily's cloth | about 48,000 | Built only when the chamber scene is first used, then switched off. |
Nothing here adds a real-time shadow caster. All figures are disabled when not on screen. Everything is built at start by the
director, which adds roughly half a second of load in the embedded browser. The old Matron was a few thousand triangles, so the
cost is real: **test the hall encounter on the actual Mac**. If it is too heavy, the first knobs are the head and hair grid sizes
in `Head.ts` and `MatronModel.ts`.

## 5. Limitations that remain (not hidden)
- **Matron:** reads as a convincing, uncanny woman at game distance and in the hall; the face close-up is still a **waxy
  mannequin look with wide staring eyes**, not a believable human face, and the ruff is large. The hands are small. Eyes do
  not move. Walking and the cinematic gestures were not re-tested with the new model.
- **Witness:** the hand holding the photograph is awkward, and the stipple dissolve makes the fine detail noisy by design.
- **Hollow:** the head is still a smooth egg and the arms are visibly tubular with ring creases.
- **Unremembered:** read as stacked slices; closer to "disassembled" than "almost a remembered person". There are no faces.
- **Emily:** the body reads clearly under the sheet, but the face under the veil is only a suggestion, the hand and bow are
  simple, and the cloth is brightly warm-lit by the bedside lamp. The finale's own camera glides were authored for the old
  layout and were **not re-run in the real finale**; they still aim at the same bed.
- All views were judged in the embedded browser; colours on a real display may differ.
- Presentation choices in the captures: close-ups of the Matron's face use a softer side lamp, and Emily's shots use a lower
  torch so the lamp's raking light shows the folds. The in-game torch is not changed.

## 6. Screenshots (all 1600 x 1200 PNG, each opened and inspected)
Captured by the dev-only showcase (`?showcase`), which places the **game's own models** (the same classes and builders the game
uses) in an isolated studio, or uses the **real chapter-8 chamber** and the **real house and player camera**. Not part of any
production build.

Folder: `docs/entity-reference-v2/`
- `matron-full.png`
- `matron-face.png`
- `matron-silhouette.png` (a three-quarter side view against a pale wall)
- `matron-speaking.png` (extra: mouth open with her voice)
- `matron-gameplay-hall.png` (in the real foyer and hallway, at the hall encounter's far spot, through the player camera and the house lighting)
- `matron-gameplay-near.png` (extra: the same, closer)
- `witness-full.png`
- `witness-closeup.png`
- `witness-photograph.png`
- `hollow-full.png`
- `hollow-closeup.png`
- `unremembered-full.png`
- `unremembered-closeup.png`
- `emily-body-scene.png`
- `emily-body-closeup.png`

## 7. Do the normal game and Observer Mode still work?
- Normal game: loads to the menu with no new console errors (the old messages in the page console were from an earlier
  broken build). **The full story, the finale and the Matron encounters were not replayed.**
- Observer Mode: `?observer=true` loads its panel and object. Its isolated save namespace is unchanged. **The automated run
  was not repeated.**
- Normal saves: untouched. The showcase uses its own storage name and never starts the story.

## 8. Typecheck and production build
- `npm run typecheck`: clean.
- `npm run build`: succeeds, dist 3.9 MB, and `dist/` contains no showcase, Observer or capture-route strings. The showcase and its
  save route exist only in the dev server.

## 9. Files
New: `src/horror/models/{Sculpt,Head,MatronModel,WitnessModel,HollowModel,FragmentModel}.ts`, `src/world/EmilyShroud.ts`,
`src/dev/showcase/Showcase.ts`. Changed: `src/horror/{CharacterBuilder,Matron,Unremembered}.ts` (now delegate to the new models),
`src/world/Stage.ts` (the chamber figure), `src/core/Game.ts` (showcase hook), `vite.config.ts` (dev-only screenshot route).
