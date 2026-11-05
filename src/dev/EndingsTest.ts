import { EventBus } from "../core/EventBus";
import { GameState } from "../core/GameState";
import { EvidenceSystem } from "../story/EvidenceSystem";
import { ROUNDS, caughtEnding, factsOf, resolve } from "../story/Endings";

/**
 * Developer-only tests of the confrontation's branching, run against the real ending logic with the real evidence and state classes
 * (reached through `__debug.endingTests()`; never part of a production build). Each case builds a fresh game state: nothing carries between them.
 */
const REQUIRED = ["living-photo", "kitchen-note", "emily-recorder", "album-print", "fake-tape", "tape-analysis", "anna-letter", "machine-msg3", "phone-bill"];
const MOTIVE = ["house-statement", "parish-letter", "emily-room-note"];

function world(o: { evidence?: string[]; reconstructed?: boolean; tapeExposed?: boolean; body?: boolean; mirror?: boolean; surfaced?: boolean }) {
  const events = new EventBus();
  const state = new GameState(events);
  const ev = new EvidenceSystem(events, state);
  for (const id of o.evidence ?? []) ev.collect(id);
  if (o.surfaced) for (const m of ["m1", "m2", "m3", "m4", "m5", "m6"]) ev.introduce(m, true);
  if (o.reconstructed ?? true) state.set("puzzle:reconstruct");
  if (o.tapeExposed ?? true) state.set("puzzle:voice-analysis");
  if (o.body ?? true) state.set("seen:body");
  if (o.mirror ?? true) state.set("seen:mirror");
  return { ev, state, facts: () => factsOf(ev, state) };
}

export interface TestRow {
  test: string;
  expected: string;
  actual: string;
  pass: boolean;
}

export function runEndingTests(): { rows: TestRow[]; passed: number; failed: number } {
  const rows: TestRow[] = [];
  const t = (test: string, expected: unknown, actual: unknown): void => {
    const e = JSON.stringify(expected);
    const a = JSON.stringify(actual);
    rows.push({ test, expected: e, actual: a, pass: e === a });
  };
  const full = (extra: string[] = MOTIVE) => world({ evidence: [...REQUIRED, ...extra] });

  // Question 2 (the comfort round) offers: with responsibility, "Stay." and "I did this."; without it, "Stay." and "I can't look at it."
  {
    const w = full();
    t("responsibility is true with the required evidence", true, w.facts().responsibility);
    t("Q2 options with responsibility", ["stay", "own"], ROUNDS.comfort.choices(w.facts()).map((c) => c.id));
    const nr = world({ evidence: REQUIRED, reconstructed: false });
    t("Q2 options without responsibility", ["stay", "afraid"], ROUNDS.comfort.choices(nr.facts()).map((c) => c.id));
  }
  // The memories that have surfaced in the journal must not change the answer (they surface on timers and were lost when a game was closed in time).
  {
    const quiet = world({ evidence: [...REQUIRED, ...MOTIVE], surfaced: false });
    const loud = world({ evidence: [...REQUIRED, ...MOTIVE], surfaced: true });
    t("memories doubted, none surfaced in the journal", loud.facts().memoriesDoubted, quiet.facts().memoriesDoubted);
    t("responsibility, none surfaced in the journal", true, quiet.facts().responsibility);
  }
  // The branch matrix: Question 1 x Question 2.
  const f = full().facts();
  const path = (...c: string[]) => resolve(c, f);
  t("Q1 option 1 (Take me to her room) ends in Denial", "denial", path("stay"));
  t("Q1 option 2, Q2 option 1 (Stay)", "denial", path("unsure", "stay"));
  t("Q1 option 3, Q2 option 1 (Stay)", "denial", path("refuse", "stay"));
  t("Q1 option 2, Q2 option 2 (own it) does not end the conversation", null, path("unsure", "own"));
  t("Q1 option 3, Q2 option 2 (own it) does not end the conversation", null, path("refuse", "own"));
  t("Q1 option 2, Q2 own, Q3 accept", "recognition", path("unsure", "own", "accept"));
  t("Q1 option 3, Q2 own, Q3 accept", "recognition", path("refuse", "own", "accept"));
  t("Q1 option 2, Q2 own, Q3 refuse (understands the Matron)", "chase", path("unsure", "own", "refuse"));
  t("Q1 option 3, Q2 own, Q3 refuse (understands the Matron)", "chase", path("refuse", "own", "refuse"));
  // Where each choice leads, one round at a time (the decision that is stored is the one made).
  t("Q2 stay leads to denial", "denial", ROUNDS.comfort.next("stay"));
  t("Q2 own leads to the plan round", "plan", ROUNDS.comfort.next("own"));
  t("Q2 afraid leads to denial", "denial", ROUNDS.comfort.next("afraid"));
  t("Q1 unsure and refuse both lead to Q2", ["comfort", "comfort"], [ROUNDS.offer.next("unsure"), ROUNDS.offer.next("refuse")]);
  // Without enough understanding the last question offers no way to refuse her.
  {
    const w = world({ evidence: [...REQUIRED, "house-statement"] });
    t("Q3 options with one motive clue", ["accept"], ROUNDS.plan.choices(w.facts()).map((c) => c.id));
    const w2 = world({ evidence: [...REQUIRED, "house-statement", "parish-letter"] });
    t("Q3 options with two motive clues", ["accept", "refuse"], ROUNDS.plan.choices(w2.facts()).map((c) => c.id));
  }
  // Being caught decides from what was said, never by chance.
  const caught = (...decisions: string[]) => {
    const w = full();
    for (const d of decisions) w.state.set(`decision:${d}`);
    return caughtEnding(w.state);
  };
  t("caught after honest answers", "recognition", caught("offer:refuse", "comfort:own", "plan:refuse"));
  t("caught after evading the first question", "denial", caught("offer:unsure", "comfort:own", "plan:refuse"));
  t("caught after Q2 Stay", "denial", caught("offer:refuse", "comfort:stay"));
  t("caught without ever owning it", "denial", caught("offer:refuse"));
  // Separate attempts: a fresh world has no decisions at all.
  {
    const a = full();
    a.state.set("decision:comfort:stay");
    const b = full();
    t("a fresh attempt starts with no decisions", false, b.state.get("decision:comfort:stay"));
  }
  const passed = rows.filter((r) => r.pass).length;
  return { rows, passed, failed: rows.length - passed };
}
