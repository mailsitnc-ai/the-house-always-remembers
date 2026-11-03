# Visual refinement report

Phase 7 has not been started. Story, canon, voices, animations (existing behaviour), save format and Observer Mode logic are
unchanged. No dependency was added. Typecheck is clean and the production build succeeds (`dist/` has no showcase, Observer or
capture-route code). Screenshots: `docs/entity-reference-v3/` (19 PNGs, 1600 x 1200, every one opened and inspected).

**Honest verdict:** this pass fixed real construction problems and the characters now hold up **in the actual game environment**
(the hallway, Emily's room, the dark living room). The **close-ups still do not** hold up everywhere: the Matron's face is a
believable older woman at gameplay distance but still a mannequin when studied, and the hands (Witness, Emily, Matron) are the
weakest part of the whole set. I am not claiming those are solved.

## 1. Matron
**Changed**
- Face rebuilt from a more careful feature set: deeper upper-lid hollows with a crease, bags under the eyes, a nose with a very
  slight bend, marionette lines at the corners of the mouth, a slightly skewed mouth line, and **deliberate left/right asymmetry**
  (brow height, socket depth, cheek strength, nose).
- **Eyebrows are no longer modelled.** They are painted into the skin as soft hair that thins toward the temple (the sharp,
  stylised brow meshes are gone).
- **Skin** is baked at 768x384 with blotchy redness and sallowness, spots, pores, crow's feet, forehead, lip and under-eye lines;
  specular and emissive were reduced so it no longer shines like wax.
- **Eyes**: smaller (11.3 mm), a darker, duller hazel-grey iris with a catch-light, sclera shaded toward the corners, a very slight
  non-parallel gaze. **Lids** are thicker shells with a thin lash line, a heavier upper lid on one side, and a matte material.
  The earlier "glasses rim" look (shiny lids) was a material mismatch, fixed.
- **Hairline** wraps behind the ear down to the nape; strands are smoothed into locks; the skin texture is baked around the side
  of the head (it ended in a visible seam at the temple before; found by viewing the side).
- **Neck and collar**: the neck is thicker at the base, shorter, mottled and no longer a bare pole; the ruff is much smaller and
  the bodice is lowered below the collar, so the face is the focus.
- Checked from the front, three-quarter and side (`matron-face-front/3q/side.png`) and at gameplay distance
  (`matron-gameplay-hall.png`, `matron-gameplay-near.png`).

**Still wrong:** the head is long and the face flat from three-quarter view, the eyes look slightly unfocused, the neck is still
plain, and a warm yellow rim shows along the cheek and jaw under the side lamp (it persists with specular and emissive switched
off, so it is the diffuse terminator against the warm light; not fully understood). At game distance in the hall she reads as a
composed, unsettling older woman.

## 2. Witness
- Coat shoulders now go into the sleeves through **shoulder caps** (the sleeve no longer stops at the coat edge), sleeves start
  inside the coat, the creases are irregular instead of zebra stripes, the legs taper, the posture leans a few degrees.
- The photograph is **smaller** (a small print) and **the family of four is clearly recognisable** in the close-up (father, boy, girl,
  mother). The grip was changed to a hand beneath the card.
- Kept: amber grain, hidden face, cyan afterimage and behaviour.
- **Still wrong:** the **hand is a poor construction** (a rounded block with knobbed fingertips); the grain makes everything noisy
  by design. In Emily's room (`witness-gameplay-room.png`) the silhouette is convincing.

## 3. Hollow
- The hollow chest and trailing lower body are kept. The head is now the same sculpted skull as the Matron, aged past recognition:
  sunken, empty dark sockets, a nose ridge, **no mouth**, asymmetric, scaled up and bowed. The neck flows from the shoulder
  slope into the head instead of a collar around an egg. Arms start inside the shoulder with a continuous taper (no pinched wrists).
- **Still wrong:** the head is small beside the wide shoulders and looks like a hood at some angles; arms are still tubes.
  In the dark living room (`hollow-gameplay-living.png`) it reads well.

## 4. Unremembered
- The humanoid is built **first** (head, neck, shoulders, a flared dress or a hem and legs, arms with a gap from the body, a
  stretched adult with raised arms, a floating hand with separate fingers) and **then** broken: finer 2.4 cm slices, smaller
  slips, a few large ones, fewer missing. The child now reads as a child. Brighter, a little more opaque.
- **Still wrong:** the figures remain stacked slabs when seen close, with no face. In Emily's room
  (`unremembered-gameplay-room.png`) the one in view is **faint**; check it in play.

## 5. Emily
- **The two round objects near the pillow are intended: they are the teddy bear** (a real object in the bedroom, also in the
  "remembered" version of the room), previously two spheres. It is now a recognisable seated bear (head, snout, ears, arms, legs).
  Nothing accidental was removed.
- Child proportions (larger head, narrow shoulders, short neck), a contact crease where the cloth leaves the body, a smaller
  ribbon bow of flat loops and a knot with two tails, a larger hand with spread fingers. Covered and non-graphic.
- **Still wrong:** `emily-hand-ribbon.png` is **not good enough**: the hand is a smooth lump with stubby fingers and the bow
  reads as rings. The body reads under the sheet at game distance, less so in the torch-lit real chamber shot.

## 6. Real game environment (not showcase lighting)
Captured through the real player camera and torch: Matron in the hallway, Witness in Emily's room, Hollow in the living room with
every lamp off (as its encounter requires), Unremembered at the encounter's own positions, and the chapter-8 chamber at the
finale's own first and second camera poses (`emily-chamber-real.png`, `emily-chamber-real-2.png`). The studio shots use a dim torch
and a side lamp, and say so.

## 7. Performance
Matron about 68,000 triangles (unchanged this pass; the head grid is 96x84, hair 64x90), Witness about 19,000 (and again for
its afterimage), Hollow about 18,000 with a head texture that is baked once, fragments about 5,000 each. The Hollow's new head
reuses the Matron's sculpting code and adds one 768x384 texture and about 0.3 s of load. Real-Mac performance is **unmeasured**.

## 8. Not done / not verified
The new models were not replayed through the full game, the finale or Matron walking. Observer Mode was not run. The hand
construction needs another dedicated pass.

## 9. Screenshots (`/Users/shivam/Desktop/THE HOUSE THAT REMEMBERS/docs/entity-reference-v3/`)
`matron-face-front.png`, `matron-face-3q.png`, `matron-face-side.png`, `matron-full.png`, `matron-gameplay-hall.png`,
`matron-gameplay-near.png`, `witness-full.png`, `witness-photograph.png`, `witness-gameplay-room.png`, `hollow-full.png`,
`hollow-head.png`, `hollow-gameplay-living.png`, `unremembered-full.png`, `unremembered-closeup.png`,
`unremembered-gameplay-room.png`, `emily-chamber-scene.png`, `emily-hand-ribbon.png`, `emily-chamber-real.png`,
`emily-chamber-real-2.png`.
