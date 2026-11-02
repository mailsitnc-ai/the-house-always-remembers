/** Playback devices in the house and the tapes each one holds. */
export interface TapeSlot {
  recording: string;
  /** Label as written on the tape or shown by the machine. */
  label: string;
  /** Hidden until the Matron chapter begins. */
  needsFalseTape?: boolean;
}

export interface DeckDef {
  id: string;
  name: string;
  tapes: TapeSlot[];
}

export const DECKS: Record<string, DeckDef> = {
  study: {
    id: "study",
    name: "Dad's tape deck",
    tapes: [
      { recording: "birthday", label: "EM 7 — CANDLES" },
      { recording: "dictaphone", label: "NOTE TO SELF" },
      { recording: "fake", label: "FOR DANIEL", needsFalseTape: true },
    ],
  },
  living: {
    id: "living",
    name: "Cassette player",
    tapes: [{ recording: "christmas", label: "XMAS — EM + DAN" }],
  },
  emily: {
    id: "emily",
    name: "Emily's toy recorder",
    tapes: [{ recording: "em3", label: "EM 3 — Fri 7:05" }],
  },
  machine: {
    id: "machine",
    name: "Answering machine",
    tapes: [
      { recording: "msgs12", label: "Messages 1 and 2 (afternoon)" },
      { recording: "msg3", label: "Message 3 — 8:20 pm" },
    ],
  },
};
