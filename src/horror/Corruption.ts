import type { EvidenceSystem } from "../story/EvidenceSystem";
import type { GameState } from "../core/GameState";
import { factsOf } from "../story/Endings";

/**
 * How far the Matron's presentation has failed, from 1 (composed) to 4 (the true form), derived purely from what Daniel has
 * actually found and done. It is computed from evidence and flags, never from a timer, so it is correct after loading a save, it
 * never goes backwards, and it needs nothing new in the save. It does not reveal anything the player has not earned: each step
 * follows a discovery the player has already made.
 *
 *  1  the composed woman    nothing in the house has yet contradicted her
 *  2  the uneasy woman      two of Daniel's false memories are doubted, or the tape that spoke in Emily's voice is exposed
 *  3  the unmasking         Emily's burial is on the table (the funeral card), the motive clues begin (the house kept, the
 *                           plot, Emily's room), the mirror has shown Daniel what he is, or four memories have fallen
 *  4  the true form         the confrontation in Emily's room, when Daniel sees the body and answers her
 */
export function corruptionStage(evidence: EvidenceSystem, state: GameState): 1 | 2 | 3 | 4 {
  const f = factsOf(evidence, state);
  if (state.get("finale:chamber") || f.bodySeen) return 4;
  if (evidence.has("funeral-card") || f.motiveClues >= 1 || f.mirrorSeen || f.memoriesDoubted >= 4) return 3;
  if (f.memoriesDoubted >= 2 || f.tapeExposed) return 2;
  return 1;
}
