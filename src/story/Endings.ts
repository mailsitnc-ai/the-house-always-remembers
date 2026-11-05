import type { EvidenceSystem } from "./EvidenceSystem";
import type { GameState } from "../core/GameState";

/**
 * Ending logic, kept free of rendering and timing so it is deterministic and testable (see docs/ENDINGS.md).
 *
 * The player never sees a score. They see only what Daniel is able to say: a line is offered only if he knows enough to
 * mean it.
 */
export type EndingId = "denial" | "recognition" | "true";

/** What a round of the confrontation can lead to: another round, an ending, or the chase that decides between the True Ending and the others. */
export type Outcome = Round["id"] | EndingId | "chase";

export interface Facts {
  /** The night has been put in order (the reconstruction puzzle). */
  reconstructed: boolean;
  /** Number of Daniel's six false memories that evidence has doubted or refuted. */
  memoriesDoubted: number;
  /** The "Emily" tape has been shown not to be her. */
  tapeExposed: boolean;
  /** How many of the clues about the Matron's purpose (the house kept, the plot, the room) have been found. */
  motiveClues: number;
  bodySeen: boolean;
  mirrorSeen: boolean;
  /** Derived. Daniel can honestly say he did this. */
  responsibility: boolean;
  /** Derived. Daniel understands who the Matron is and what she wants. */
  understandsMatron: boolean;
}

/** Evidence that exposes the Matron's purpose. None is required on its own; two are enough. */
export const MOTIVE_CLUES = ["house-statement", "parish-letter", "emily-room-note"] as const;

export const THRESHOLDS = { memoriesDoubted: 4, motiveClues: 2 } as const;

export function factsOf(evidence: EvidenceSystem, state: GameState): Facts {
  // From the evidence, not from the journal's surfaced memories (see EvidenceSystem.doubtedCount).
  const memoriesDoubted = evidence.doubtedCount();
  const motiveClues = MOTIVE_CLUES.filter((id) => evidence.has(id)).length;
  const reconstructed = state.get("puzzle:reconstruct");
  const tapeExposed = state.get("puzzle:voice-analysis");
  const bodySeen = state.get("seen:body");
  const mirrorSeen = state.get("seen:mirror");
  const responsibility = reconstructed && memoriesDoubted >= THRESHOLDS.memoriesDoubted;
  const understandsMatron = tapeExposed && bodySeen && mirrorSeen && motiveClues >= THRESHOLDS.motiveClues;
  return { reconstructed, memoriesDoubted, tapeExposed, motiveClues, bodySeen, mirrorSeen, responsibility, understandsMatron };
}

export interface Choice {
  id: string;
  text: string;
}

export interface Round {
  id: "offer" | "comfort" | "plan";
  /** Recordings that play, in order, before the choices appear. */
  recording(f: Facts): string[];
  choices(f: Facts): Choice[];
  /** Where each choice leads: another round, an ending, or the final chase. */
  next(choice: string): Outcome;
}

export const ROUNDS: Record<Round["id"], Round> = {
  offer: {
    id: "offer",
    recording: () => ["fin-offer"],
    choices: (f) => {
      const c: Choice[] = [
        { id: "stay", text: "Take me to her room." },
        { id: "unsure", text: "I don't know what happened." },
      ];
      if (f.responsibility) c.push({ id: "refuse", text: "That isn't what happened." });
      return c;
    },
    next: (c) => (c === "stay" ? "denial" : "comfort"),
  },
  comfort: {
    id: "comfort",
    recording: () => ["fin-comfort"],
    choices: (f) => {
      const c: Choice[] = [{ id: "stay", text: "Stay." }];
      if (f.responsibility) c.push({ id: "own", text: "I did this. I'm sorry." });
      else c.push({ id: "afraid", text: "I can't look at it." });
      return c;
    },
    next: (c) => (c === "own" ? "plan" : "denial"),
  },
  plan: {
    id: "plan",
    // Daniel is only told the whole of it if he has already worked it out from the evidence.
    recording: (f) => (f.understandsMatron ? ["fin-plan", "fin-plan-known"] : ["fin-plan"]),
    choices: (f) => {
      const c: Choice[] = [{ id: "accept", text: "Then it's mine to carry. Let it end here." }];
      if (f.understandsMatron) c.push({ id: "refuse", text: "No. But you don't get to decide what I do with it." });
      return c;
    },
    // Refusing her does not end anything: she stops pretending, and Daniel has to get out of the house. The chase decides the rest.
    next: (c) => (c === "refuse" ? "chase" : "recognition"),
  },
};

/** Walks a list of choices through the rounds. Used by the finale and by tests. Returns an ending, "chase", or null if the choices do not finish the conversation. */
export function resolve(choices: string[], f: Facts): EndingId | "chase" | null {
  let round: Outcome = "offer";
  for (const c of choices) {
    if (round === "denial" || round === "recognition" || round === "true" || round === "chase") break;
    const r: Round = ROUNDS[round];
    if (!r.choices(f).some((x) => x.id === c)) return null;
    round = r.next(c);
  }
  return round === "denial" || round === "recognition" || round === "true" || round === "chase" ? round : null;
}

/**
 * Where the Matron's catching Daniel leads. It follows what Daniel has said and what he knows, never chance. If he has answered her honestly
 * all the way (he never said "I don't know what happened" or "Take me to her room", and he owned what he did) he is caught as a man who
 * knows his part: Recognition. If he evaded her at any point he is caught as a man who still wants to be taken somewhere safe: Denial.
 */
export function caughtEnding(state: GameState): "denial" | "recognition" {
  const evaded = state.get("decision:offer:stay") || state.get("decision:offer:unsure") || state.get("decision:comfort:afraid") || state.get("decision:comfort:stay");
  return evaded || !state.get("decision:comfort:own") ? "denial" : "recognition";
}

/** Plain-language deductions for the journal, shown only once their conditions are met. */
export function deductions(evidence: EvidenceSystem, state: GameState): { id: string; text: string }[] {
  const out: { id: string; text: string }[] = [];
  const add = (id: string, ok: boolean, text: string) => ok && out.push({ id, text });
  const f = factsOf(evidence, state);
  add("night", f.reconstructed, "The evening has an order now. An hour of it was never written down, and Daniel was in charge of it.");
  add("tape", f.tapeExposed, "The tape that sounds like Emily is not her. Something is imitating her, and it gets her words wrong.");
  add("photo", evidence.has("album-print") && evidence.has("living-photo"), "The photograph on the wall has a fifth figure that the original print never had. The house has been adding to what Daniel sees.");
  add("service", evidence.has("funeral-card"), "There was a service for Emily. Daniel wrote 'Sorry' inside the cover, and crossed it out, and wrote it again.");
  add("kept", evidence.has("house-statement"), "Someone has been paying to keep the house exactly as it was. It was not Mum or Dad.");
  add("plot", evidence.has("parish-letter"), "Emily was buried in a churchyard. The next spring her plot was found disturbed, and the family were never told what was found.");
  add("room", evidence.has("emily-room-note"), "Emily's room has been tended. Lavender, camphor, cold. Mum noticed it years ago and could not explain it.");
  add("interest", evidence.has("parish-letter") && (evidence.has("house-statement") || evidence.has("emily-room-note")), "Something has been looking after the house, Emily's room, and whatever happened at her grave. It has an interest in Emily herself, not only in Daniel.");
  add("mirror", f.mirrorSeen, "What Daniel sees of himself has been shaped by the thing in the house. His guilt has been used, and made worse than it is.");
  add("body", f.bodySeen, "After the burial the Matron took Emily and has kept her preserved for eleven years. It is Emily's body she wants.");
  add("plan", f.bodySeen && f.motiveClues >= THRESHOLDS.motiveClues, "Daniel is the bridge: his guilt, his memories and his love for Emily are the way to her. Emily's body is the vessel the Matron means to possess. She does not want Emily back. She called Daniel home to reach what was left.");
  return out;
}
