# VOICE DIRECTION — THE HOUSE ALWAYS REMEMBERS

Reference voices for Daniel, Emily and the Matron. The three recordings are the **approved ElevenLabs voice identities** (USER APPROVED — KEEP THIS VOICE DESIGN). All future dialogue must use these same identities. They are references only: this document does not generate, clone or recreate any voice, and no voice-generation service was called.

## Approval status

| Character | Reference file | Status |
|---|---|---|
| **Daniel** | `Audio/Daniel.mp3` | **USER APPROVED — KEEP THIS VOICE DESIGN** |
| **Emily** | `Audio/Emily.mp3` | **USER APPROVED — KEEP THIS VOICE DESIGN** |
| **The Matron** | `Audio/Matron.mp3` | **USER APPROVED — KEEP THIS VOICE DESIGN** |

The project owner has personally listened to all three samples and approved all three as suitable for their characters. **These voices are not to be redesigned, replaced or regenerated.** The three MP3s are the approved reference recordings: their filenames and locations stay as they are, and they must never be modified, overwritten, moved or deleted.

**Voice IDs and configuration.** No ElevenLabs voice ID, key or generation setting is recorded anywhere in this project (checked across the project files). Nothing has been created or changed. Whatever IDs and settings exist outside the project must be preserved as they are, and should be noted here by the owner when convenient (see section 7).

**Scope of the approval.** The owner's approval is a judgement made by ear. This document's own measurements (sections 1 to 4) describe timing, words and signal properties; they are **not proof of** and do not replace the owner's judgement about age, accent, texture or emotional impact. Where this document says "[NEEDS EAR]", the owner's approval stands in for it, but no specific description was given, so none is invented.

## 0. How this was analysed, and what could not be heard

### 0.1 Honest status
**No audio-understanding service is available to me, so I have still not heard the recordings.** What I have is:
1. **A transcript of each sample** (words, word timings and recognition confidence) from a local, offline speech-to-text model.
2. **Signal measurements** (pitch, loudness, spectral balance, pauses).

Those tell me **what is said, how fast, how clearly it was recognised, and how the pitch and loudness move**. They do **not** tell me accent, age, vocal texture, emotional quality or whether a voice sounds natural, sweet, menacing or artificial. Those judgements are marked **[NEEDS EAR]** below. The owner has since listened and approved all three voices (see Approval status); no detailed description of what they heard was supplied, so these items are left unfilled rather than guessed. The analysis was made without hearing the recordings, and it is kept here only as a technical record.

### 0.2 Services checked
| Service or tool | Available? | Used? |
|---|---|---|
| Audio-understanding service that accepts audio files (an AI audio model) | **None configured.** No audio-capable integration is connected to this session. | No |
| Google GenAI Python library (`google-genai`) | The library is installed, but I found **no credentials** configured for it, so it cannot be used. I did not look for or create any key, and did not start any paid service. | No |
| ElevenLabs | No key or integration present. Not called. | No |
| macOS Speech framework | Present, but this environment's Swift toolchain could not build a recogniser earlier in the project. | No |
| `faster-whisper` 1.2.1 with the **already-cached** local models `base.en` and `tiny.en` (offline, free) | Yes | **Yes**, for transcripts and word timings only |
| Numerical signal analysis (Python, NumPy, SciPy) on decoded copies | Yes | **Yes** |

Nothing was installed or downloaded, no network service was called, and nothing was spent. Both whisper models gave **identical transcripts** for all three files.

### 0.3 The originals
Files: `Audio/Daniel.mp3`, `Audio/Emily.mp3`, `Audio/Matron.mp3` (capital A). Read-only. Decoded copies for measurement were written only to a scratch folder outside the project. Checksums match before and after analysis.

| File | SHA-256 |
|---|---|
| Daniel.mp3 | `2a3a99eee2eb0894d2c9d57294a58f2f1ca3e6b048b7dca09c62790f1452d687` |
| Emily.mp3 | `900fb52a5173f81161bcc9178ab738038b9758749f8e815029768735932a210c` |
| Matron.mp3 | `71530ddcd07a2e5f38cba44e72f4f38489f31234e10c04cb6b80cde40fba7d3e` |

All three: mono, 44.1 kHz, 128 kbit/s MP3, 2.0 to 4.1 s long, one phrase each.

## 1. What each sample says (from speech-to-text)

| Character | Spoken words | Recognition confidence |
|---|---|---|
| **Daniel** | "I remember this room. I just don't remember it looking like this." | High on every word (0.86 to 1.00) |
| **Emily** | "Why did you leave me, Daniel?" | High (0.81 on "Why", 0.96 to 1.00 elsewhere) |
| **The Matron** | "You always were such a difficult child, Daniel." | High, except the first word "You" (0.62 to 0.64) |

Meaning for the game:
- **Emily's sample is the opening-call line, "Why did you leave me, Daniel?"**, which confirms the current wording.
- The Matron's sample is a **reproachful, controlling** line, not a sweet one. How it is *delivered* is what matters, and that needs an ear.
- Daniel's sample is a quiet, reflective observation of the room: a natural fit for an introspective character.

**Diction (supported):** two independent models transcribed every word correctly, so the **diction is clear and intelligible in all three**, with no mumbled words. The only low-confidence words are the very first word of the Matron ("You") and of Emily ("Why"); see the weaknesses in section 6.

## 2. Measurements side by side

| | Daniel | Emily | Matron |
|---|---|---|---|
| Duration | 4.13 s | 1.96 s | 3.87 s |
| Words / words per second (from word timings) | 12 / about 3.3 | 6 / about 4 | 8 / about 2.4 |
| Longest gap between words | 0.78 s (between the two sentences) | 0.12 s (before "Daniel?") | 0.24 s (before "Daniel.") |
| Words drawn out | "this" (0.3 s) | "me," (0.3 s) | **"were" (0.6 s), "such" (0.5 s), "child," (0.6 s)** |
| Pitch, all voiced frames (median, p10 to p90) | 145 Hz (95 to 192) | 253 Hz (113 to 316) | 149 Hz (125 to 252) |
| Pitch, strict subset | 173 Hz (149 to 229) | 264 Hz (190 to 316) | 245 Hz (215 to 255) |
| Spectral centroid / energy above 2 kHz | 848 Hz / 12 % | 353 Hz / 2 % | 1094 Hz / 19 % |
| Average level / peak | -18.5 / -6.1 dBFS | -19.6 / -7.6 dBFS | -18.8 / -5.6 dBFS |

Cautions: the samples are very short; pitch was estimated by autocorrelation and can read an octave out (the two estimates above disagree most for the Matron, so her true register is uncertain, and the per-word pitch values I looked at were too noisy to rely on). The word timings come from speech recognition and are accurate to roughly 0.1 s.

**Correction to my earlier waveform-only notes.** The earlier version of this file counted loudness peaks as "syllables" and called **Daniel the slowest speaker**, with the Matron "even and mid-paced". The word timings show otherwise: **the Matron is the slowest and most deliberate (about 2.4 words a second, with long drawn-out stressed words), Daniel is in the middle (about 3.3, with one long 0.78 s pause), and Emily is the fastest (about 4).** The earlier "peaks per second" figure was misleading and has been replaced.

## 3. Voice profiles

The ten original profile points plus the two added ones (diction, pauses and emphasis, naturalness, and delivery in the game's emotional situations). Items I could not determine are marked **[NEEDS EAR]**.

### 3.1 Daniel
1. **Perceived age range.** [NEEDS EAR]. Canon: 24.
2. **Accent and regional characteristics.** [NEEDS EAR]. The recogniser handled the speech easily with an English-language model, which says nothing reliable about the accent.
3. **Pronunciation and diction.** Clear. Every word recognised at high confidence. Fully intelligible.
4. **Pitch and register.** Measured median about 145 to 173 Hz, a wide spread (about 7 to 12 semitones). Pitch **falls at the end of each sentence** ("room", the final "this" both sit at the bottom of his range), which suggests settled, declarative, unforced phrasing. Per-word values are noisy, so treat as indicative.
5. **Tone and resonance.** Mostly low-frequency energy (79 % below 500 Hz), moderate brightness. How it sounds [NEEDS EAR].
6. **Vocal texture.** [NEEDS EAR].
7. **Pace and rhythm.** About 3.3 words a second: neither rushed nor slow. The defining feature is a **0.78 s pause after the first sentence**, which reads as thinking or hesitation.
8. **Pauses, emphasis, intonation.** Louder on "remember" (the key word, both times) and quieter on small words; a falling pitch at the sentence ends; the second sentence ends very quiet ("this" is the quietest word at about -27 dB), a trailing off. These are measured, and fit a restrained, introspective delivery.
9. **Emotional character.** [NEEDS EAR]. The measured pattern (pause, trailing quiet end, stress on "remember") is **consistent with** restrained and introspective, but I cannot confirm how it sounds.
10. **Natural or artificial.** [NEEDS EAR]. The pause and the quieter ending are the kind of variation natural speech has; whether it sounds synthetic I cannot judge.
11. **Recognisable by.** Measurably: the mid-phrase pause and the quiet, falling endings.
12. **Delivery in the game.** See section 5.

### 3.2 Emily
1. **Perceived age range.** [NEEDS EAR]. Canon: 8 when she died. The pitch is the highest of the three (median about 250 Hz, up to about 370 Hz), which is consistent with a young or high voice, but that alone is not proof of a child's sound.
2. **Accent.** [NEEDS EAR].
3. **Pronunciation and diction.** Clear. Only the first word was recognised with lower confidence (0.81). Fully intelligible.
4. **Pitch and register.** Highest and the widest-moving of the three (about 9 to 18 semitones). The pitch **rises** through "did you" (about 300 Hz) and falls through "leave me" (about 250 Hz). The very last word "Daniel?" measures low (about 114 Hz) but is a very short word near a gap, so that reading is unreliable. Whether the line ends as a rising question or a falling plea [NEEDS EAR].
5. **Tone and resonance.** 96 % of energy below 500 Hz with little upper energy: a soft, dark balance in the measurement. How it feels (warm, muffled, breathy) [NEEDS EAR].
6. **Vocal texture.** [NEEDS EAR].
7. **Pace and rhythm.** The fastest (about 4 words a second) with the line running almost continuously. **"me,"** is held slightly (about 0.3 s) before a brief 0.12 s beat and then "Daniel?".
8. **Pauses, emphasis, intonation.** Loudest on "leave" and "me" (the emotional centre of the sentence), quietest on the last word: so the stress is on being left. The short beat before the name is the only pause.
9. **Emotional character.** [NEEDS EAR]. The brief asks for warm, expressive and natural; the moving pitch and the emphasis on "leave me" are **consistent with** expressiveness, but warmth and believability cannot be measured.
10. **Natural or artificial.** [NEEDS EAR].
11. **Recognisable by.** Measurably: the highest pitch, widest pitch movement and quick run of words, with the stress on "leave me".
12. **Delivery in the game.** See section 5.

### 3.3 The Matron
1. **Perceived age range.** [NEEDS EAR]. Canon: a tall, imposing maternal woman.
2. **Accent.** [NEEDS EAR].
3. **Pronunciation and diction.** Very clear and **precisely articulated**: the most energy above 2 kHz of the three (19 %), which usually means crisp consonants. All words recognised at high confidence except the first.
4. **Pitch and register.** Uncertain (the two estimates disagree). The pitch **falls** across the line and the last words "child" and "Daniel" are the lowest of the phrase, a clean falling, declarative finish rather than a lilt.
5. **Tone and resonance.** The brightest of the three in the measurement. Whether it sounds warm, cold, rich or thin [NEEDS EAR].
6. **Vocal texture.** [NEEDS EAR].
7. **Pace and rhythm.** The **slowest and most deliberate** (about 2.4 words a second). The stressed words are drawn out: "were" about 0.6 s, "such" about 0.5 s, "child" about 0.6 s, then a short 0.24 s beat before the name.
8. **Pauses, emphasis, intonation.** She weights "were", "such", "difficult" and "child", leaning on the accusation word by word, then lets the name fall away. The loudest word is "Daniel" (about -16 dB), near the quiet-to-firm end of a reproach.
9. **Emotional character.** [NEEDS EAR]. **The key question for the owner: does she sound composed, authoritative and quietly intimidating, or too sweet?** The measurements point toward composure (slowest pace, drawn-out accusatory words, falling finish, crisp consonants) and **not** toward a sing-song or sugary contour, but I cannot confirm how she actually sounds, and whether she is intimidating or merely disapproving needs an ear.
10. **Natural or artificial.** [NEEDS EAR].
11. **Recognisable by.** Measurably: the slow, weighted, word-by-word pace and the crisp articulation.
12. **Delivery in the game.** See section 5.

## 4. The three compared

| | Daniel | Emily | The Matron |
|---|---|---|---|
| Pace | middle (about 3.3 w/s) with one long pause | **fastest** (about 4 w/s) | **slowest** (about 2.4 w/s), weighted |
| Pause | 0.78 s between sentences | almost none (0.12 s) | short beat (0.24 s) before the name |
| Stress | "remember" | "leave me" | "were / such / difficult / child" |
| Sentence ending | falls and trails off, very quiet | quietest word is the last | falls to the lowest pitch |
| Articulation (energy above 2 kHz) | moderate (12 %) | soft (2 %) | **crisp (19 %)** |
| Speaking about | the room, himself | being left | Daniel's character |

They separate **by rhythm first**: Emily quick, Daniel hesitant, the Matron slow and weighted. If any two begin to share a rhythm in later dialogue, one has drifted.

## 5. Delivery directions by emotional situation

These are **direction for future recording**, built from the measured differences and the character canon. They are not descriptions of what the samples sound like. Keep each voice true to its own rhythm: **change the situation, not the voice.**

| Situation | Daniel | Emily | The Matron |
|---|---|---|---|
| **Calm** | The reference: unhurried, quiet, a real pause between thoughts, endings that fall and trail. | The reference: quick, light and melodic, with stress on the emotionally important word. | The reference: slow, weighted word by word, crisp consonants, a falling finish. |
| **Frightened** | Keep it restrained: shorter phrases, a slightly faster pace, quieter rather than louder, more audible breath; no screaming. | Quicker and higher, smaller and softer, more breath. Never theatrical. | Almost never frightened. If she is thwarted, show it as **more** control: slower, more exact, a longer pause. Not louder. |
| **Emotional (grief, longing)** | Pauses lengthen and a line may stop short. Let a sentence trail off unfinished. | Warm and unforced; let the pitch lift and soften on the key word. Not whispered, not slowed into a lullaby. | Possessive tenderness only if the scene needs it, kept precise and a little cold. She must not become sweet or soft. |
| **Angry** | Tight and low rather than loud; short blunt phrases; the restraint breaks only once, briefly. | A child's anger: quick, sharp, rising, still a child. | **Colder, not louder.** Slower, flatter, each word placed. Her anger is certainty. |
| **Distressed** | Fragmented: broken phrases and uneven pauses; the voice catches. Avoid a shouted performance. | Higher, quicker, breathless; real distress, not a horror-film wail. | She does not become distressed. If a line must express strain, it shows as a **tighter, slower** control. |

## 6. Weaknesses in the samples to address in final dialogue production

1. **Abrupt starts.** Each file begins after only about 0.05 to 0.10 s of silence, and the first word is the least reliably recognised in two of the three ("You", "Why"). The first sound may be clipped or hard-edged. Check, and give future clips a small lead-in of silence.
2. **Short, single-phrase samples.** Each is one sentence (2 to 4 s). They show each voice in **one** emotional register, so they cannot prove how the voice sounds when frightened, angry, distressed or whispering. Test each of those once before producing in volume.
3. **Consistency risk.** Without the original voice identity and generation settings recorded, future clips can drift in pace, tone and loudness. Record the voice identity and settings used for the three samples and reuse them unchanged. (I do not have them.)
4. **Levels.** The three samples have similar loudness (average -18.5 to -19.6 dBFS) which is good for balance; keep new clips at the same level.
5. **Emily and the telephone.** Emily's spectrum is soft, with little upper energy. When the real clip is put through the in-game telephone filter, check that the line stays understandable; adjust the filter, not the voice.
6. **Pitch-estimate uncertainty** on the Matron's register (see section 2) means any pitch-based rules should be confirmed by ear.

## 7. Consistency rules for future dialogue

1. **One voice identity per character, always** (the three approved ElevenLabs identities). Do not blend them, redesign them or recreate them with another voice model, and do not create new voices or voice IDs. The existing IDs and settings must be preserved exactly.
2. **Match the reference rhythm** (section 4) before adding any emotion.
3. **Daniel**: restrained and introspective; pauses and trailing endings; no shouted performance.
4. **Emily**: young, warm, quick and melodic, with stress on the emotional word; no horror treatment on her own voice. A voice imitating her (the Matron's imitation, the telephone) must stay attributable in the script.
5. **Matron**: slow, weighted, precise and calm; **colder, not louder**; never sugary, never theatrical.
6. **Short phrases** suit all three references; test long speeches against the reference before producing them.
7. **Process**: produce and check **one** line per character, in the engine and by ear, before any volume of dialogue.
8. **Existing game audio is unchanged.** The current clips in `public/audio/dialogue/` are earlier synthetic placeholders.

## 8. Final production guidance

When final dialogue is eventually generated (not now; none is authorised yet):
- **Daniel** keeps his approved voice identity.
- **Emily** keeps her approved voice identity.
- **The Matron** keeps her approved voice identity, and her direction stays **composed, controlled and intimidating** (colder, not louder; never sugary or theatrical).
- Delivery may adapt to the scene. A character may sound frightened, distressed, angry or emotional using the guidance in section 5 **without changing the underlying voice identity**. Change the situation, not the voice.
- Before volume production, follow rule 7: check one line per character, in the engine, against the reference.
- The weaknesses in section 6 (abrupt file starts, one emotional register per sample, matching settings, the phone-filter test for Emily) are production checks. They are not reasons to redesign any voice.

## 9. Items the analysis could not describe

These were not determined by the analysis. The owner has approved all three voices by ear, so none of these is an open problem, and none should be read as a request to change a voice. Specific descriptions can be added here in the owner's words if wanted:
- Perceived age of each voice (Is Emily believably young? Does Daniel sound 24?)
- Accent and regional character of each voice
- Vocal texture of each voice
- **Does the Matron sound composed, authoritative and quietly intimidating, or too sweet?**
- Does Emily sound warm, expressive and believable?
- Does Daniel sound natural, introspective and emotionally restrained?
- Whether any of the three sounds artificial
- Whether the file starts are clipped

Optional: if the owner wants their own description of any of these recorded (age, accent, texture, feel), it can be added here in their words.
