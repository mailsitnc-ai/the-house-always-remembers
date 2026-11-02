/**
 * One voice per character, used for every line that character speaks, so each voice stays consistent across the game.
 * These profiles drive two things: the generator in tools/ (which voices to record) and the runtime (how a clip is played
 * back, for example a small pitch change). To replace a character with real recordings, drop files named like the existing
 * ones into public/audio/dialogue/ and update the manifest; nothing else in the game changes.
 */
export interface VoiceProfile {
  /** macOS voice used by tools/generate-dialogue.mjs. */
  say: string;
  /** Words per minute passed to the generator. */
  rate: number;
  /** Playback-rate multiplier at runtime. Above 1 raises pitch (and speeds up); used to make Emily sound younger. */
  pitch: number;
  /** Relative loudness of this character in the mix. */
  gain: number;
  note: string;
}

export const VOICES: Record<string, VoiceProfile> = {
  daniel: { say: "Eddy (English (UK))", rate: 172, pitch: 1.0, gain: 1.0, note: "Daniel, 24. Spoken aloud." },
  inner: { say: "Eddy (English (UK))", rate: 158, pitch: 0.97, gain: 0.9, note: "Daniel's thoughts: the same voice, closer and quieter." },
  emily: { say: "Flo (English (UK))", rate: 176, pitch: 1.2, gain: 1.0, note: "Emily, 8 (heard as a memory or on tape). Pitched up at runtime to sound younger." },
  fake: { say: "Flo (English (UK))", rate: 150, pitch: 1.2, gain: 0.9, note: "The false tape: Emily's voice, too slow and too even." },
  anna: { say: "Sandy (English (UK))", rate: 165, pitch: 1.0, gain: 1.0, note: "Mum." },
  richard: { say: "Reed (English (UK))", rate: 160, pitch: 0.96, gain: 1.0, note: "Dad." },
  teacher: { say: "Moira", rate: 165, pitch: 1.0, gain: 0.95, note: "Mrs Hale, Emily's teacher." },
  nana: { say: "Grandma (English (UK))", rate: 150, pitch: 1.0, gain: 0.95, note: "Nana." },
  matron: { say: "Shelley (English (UK))", rate: 132, pitch: 0.9, gain: 0.95, note: "The Matron: slow, composed, low, warm." },
  whisper: { say: "Whisper", rate: 150, pitch: 1.0, gain: 0.8, note: "The Unremembered: a breathy loop." },
};
