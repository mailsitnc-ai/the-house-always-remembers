# Phase 6 canon confirmation and consistency pass

Phase 7 has not been started. No audio was generated or changed, no voice service or credits were used, no packages were added,
and the three approved voice MP3s are unchanged.

## Confirmed canon now recorded everywhere
Emily died at eight and was **buried, not cremated**. The Matron later found and **preserved her body**, the intended vessel.
**Daniel is the bridge, not the vessel.** The Matron wants to possess the body, not resurrect Emily, and stays the Matron.
A search of all evidence, timeline, recordings, finale dialogue and deductions found no text implying cremation, destruction,
resurrection, or the Matron becoming Emily.

## What changed
- **Parish letter** (evidence, paper in the suitcase, timeline): now a formal letter about "the churchyard plot in which Emily was
  laid to rest last autumn", found "disturbed" in spring, asking the family to telephone. It states no cause and names no one.
  The timeline entry moved before "Years later" so the aftermath reads in order.
- **Bank statement and Mum's dresser note:** reviewed, unchanged. Both fit (the house kept "as instructed"; the room tended by
  someone Mum "does not want to know"). Neither places the body.
- **Deductions** now reveal the truth in stages, each only when its evidence is found:
  service (funeral card) → plot (parish letter) → kept / room → "interest in Emily herself" (parish letter plus either other clue) →
  mirror → body ("after the burial the Matron took Emily") → plan ("Daniel is the bridge, Emily's body is the vessel, she does not
  want Emily back").
- **Confrontation:** the plan round no longer delivers a speech to everyone. Everyone hears two short lines (what Daniel carries,
  an offer to "look after it"). Only a player who has worked the plan out (`understandsMatron`) also hears her confirm it, in two
  further lines. "It will wear her very gently" was removed. Denial never reaches this round.
- **Docs:** `STORY_BIBLE.md` (7.1 is now confirmed canon, the clue ladder and bridge/vessel wording, open questions),
  `docs/ENDINGS.md`, `docs/PHASE6_REPORT.md` (two decisions closed).
- Endings, eligibility thresholds, both phone lines ("Why did you leave me, Daniel?" / "Daniel? Why did you leave me alone?"), and
  the approved voices are unchanged.

## How the Matron's objective is revealed
Early: a funeral, an unanswered letter about a disturbed plot, a house paid for by no one. Middle: Mum's note and the statement show
something tends the house and Emily's room, so its interest is Emily, not only guilt. Late: the mirror, then Emily's preserved body
in the reconstructed room. Confirmed in words only for a player who already worked it out, and in the journal's plan deduction.

## Tests (silent)
Typecheck clean; production build succeeds. In the engine: deductions appear in the intended order and none early; the Plan round plays
the short version without the motive clues and the longer version with them; Denial, Recognition (vague) and True all resolve as before;
a save written with the new evidence reads back; no console errors; the forbidden-wording scan is empty. Chapter flow and the other
Phase 6 systems were not touched and were not re-tested beyond this.

## Remaining inconsistencies and risks
1. Burial is stated only in the parish letter, which is optional. A player who misses it still sees the funeral card and the body,
   but is never told outright that Emily was buried. Making burial explicit in a key item would fix this; I did not change the funeral card.
2. Where the body physically is stays undefined: it is shown in a room the Matron reconstructs. This avoids implying any accident location.
3. Whether the tall fifth figure in the living-room photograph is the Matron is still undecided.
4. The new dialogue is still subtitle-only, and the scenes have not been hand-played.
