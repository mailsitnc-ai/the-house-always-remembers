# Phase 3 report: story, chapters, evidence and puzzles

Status: complete for review. Phase 4 has not been started. No dependencies were added.

## New controls
**J** opens the journal (also a button in the Pause menu). **Esc** or **J** closes it. Everything else is unchanged.

## Systems
| System | File | What it does |
|---|---|---|
| Story content | `story/StoryData.ts` | All evidence, recordings, timeline, memories and chapter text, as data. |
| Evidence | `story/EvidenceSystem.ts` | Tracks what is found, optional vs key evidence, Daniel's memories and what contradicts them, and the timeline. |
| Chapters | `story/ChapterManager.ts` | The eight chapters in fixed order. Completion is evaluated whenever evidence or a flag changes, so evidence found early still counts. |
| Director | `story/StoryDirector.ts` | Opens the prologue, reacts as chapters begin, surfaces memories, judges the two evidence puzzles, handles the last door. |
| Recordings | `story/RecordingPlayer.ts`, `atmosphere/Voices.ts` | Plays recordings with subtitles. Voices are synthesised (see below). Falls back to subtitles only if audio is unavailable. |
| Devices | `story/Decks.ts`, `world/props/TapeDeck.ts` | Tape deck, cassette player, toy recorder, answering machine. |
| UI | `ui/StoryUi.ts` | Journal (Evidence, Timeline, Memories, Recordings), tape panel, chapter cards, Daniel's thoughts, subtitles, "evidence added" notices. |
| Props | `props/Examinable.ts`, `props/Suitcase.ts` | Examinable objects with no text; an openable suitcase. |

**Voices.** There are no audio files. Each line is a buzzing source shaped by three moving filters, one syllable at a time, with a pitch and
vocal-tract size per speaker (Emily high, Dad low). It is speech-like murmur, not intelligible speech, so the subtitles carry the words.
The false tape's voice is deliberately too even and has a faint echo. Genuine tapes have tape hiss and a band-limited channel; the call has a telephone channel.

## Chapters (exact names, fixed order)
| # | Chapter | You move on when |
|---|---|---|
| 1 | PROLOGUE: THE TELEPHONE | The call plays (ring, then "Daniel, why did you leave me alone?"). Space skips it. |
| 2 | HOMECOMING | You have examined the living room photograph and found Mum's note in the kitchen. |
| 3 | THE UPSTAIRS ROOM | You have played Emily's toy recorder in her bedroom. |
| 4 | FAMILY PORTRAITS | You have found the original print in the study album. |
| 5 | THE MATRON | You have solved the voice comparison (below). Prepared structurally: a mood change (lights dip, a thump) and the false tape appearing in the study deck. No encounter. `StoryDirector.onMatronChapter` is the Phase 4 hook. |
| 6 | ELEVEN YEARS AGO | You have found Mum's letter to Dad in the storage room suitcase. |
| 7 | THE MISSING NIGHT | You have put the evening in order (below). |
| 8 | THE LAST DOOR | The front door shows an end-of-Phase-3 card. No endings. |

## Evidence and the fair-play chain
27 evidence items (9 key, 18 optional). Key path:
- **Living room photograph**: five figures, a taller dark one behind. The backing paper says "No. 0412".
- **Study album**: the same lab number 0412, four people, nobody behind them. This refutes Daniel's memory of a fifth figure.
- **Mum's note** (kitchen), **Emily's toy recorder** (7:05), **answering machine message** (8:20, Dad rings, no answer), **telephone bill** (first call 8:51), **Mum's letter** (she knew Daniel was there).
- **The false tape** ("FOR DANIEL") and the **voice comparison**.

Optional evidence enriches the story without blocking anything: genuine family tapes, the calendar, shopping list, the pulled-out dining chair,
Emily's drawings, reading chart and Santa letter, the teddy bear, Daniel's homework and school photograph, Dad's dictaphone note, the order of
service, and Mum's unsent letter to Daniel.

## Puzzles (all clue-led)
1. **Whose photograph?** The frame's backing stamp (0412) matches the album print. Pure observation.
2. **Batteries.** The kitchen shopping list says "batteries (torch!)". The answering machine has an empty battery bay. The old torch is in the storage room, which opens with the brass key from the kitchen drawer (tagged "Landing").
3. **Whose voice?** After hearing at least two of Emily's genuine tapes, choose which lines of the false tape Emily would never say. Each wrong pick is explained by the genuine tapes ("Dan-Dan", "bestest", "sorry", "I'm not mad"). The wrong-answer hint does not give the answer away.
4. **Put the evening in order.** Once the five key events of the night are known, arrange them in order. The times are in the timeline above.
5. **Phase 1 keypad puzzle**: unchanged (card in the living room drawer, keypad in the foyer).

## Daniel's memories
Six recollections appear as the story reaches them. Each is shown struck through in the journal once the evidence contradicts it, with the contradicting evidence listed beneath. Nothing is explained to the player.

## Canon safety
The accident's mechanism and location are never stated or implied. The hour between Emily's last tape (7:08 pm) and Dad's unanswered call (8:20 pm) is a permanent, labelled gap in the timeline ("Nobody wrote this part down"). Nothing graphic. The Matron is only hinted at (the fifth figure, the false voice); her role is left to Phase 4.

## Tests performed
All run in the built-in browser with synchronous frame stepping, so they do not depend on the pane's frame rate.
| Test | Result |
|---|---|
| Prologue: ring, exact subtitle, hands over to Chapter 2 | Pass |
| Chapters 2 to 8 advance in order from real interactions | Pass |
| Chapters advance correctly when evidence is found out of order (retroactive completion) | Pass |
| Memories change held, doubted, refuted as evidence arrives | Pass |
| Voice comparison: wrong answer rejected with a hint, correct answer accepted | Pass |
| Gate chain: storage door locked, key from the kitchen drawer, torch batteries, answering machine powered, message 3 plays | Pass |
| Suitcase opens; letters can be read and add evidence | Pass |
| Phone bill found in the desk drawer | Pass |
| Reconstruct the night: wrong order rejected, correct order accepted | Pass |
| Last door shows the end card at Chapter 8 only | Pass |
| Recordings play with subtitles in step with the audio; subtitles-only fallback when audio is not started | Pass |
| Phase 1 keypad chain, Phase 2 interactions, benchmark walk | Pass |
| Collision walk through every room and the stairs, both directions | Pass |

## Known issues and unfinished work
- **Voices are murmur, not words.** Intelligible speech would need recorded audio or a speech engine. Subtitles carry the content. Whether the murmur lands emotionally is untested on a real listener.
- **Not heard by me.** I verified timing and routing in the browser but could not listen to the recordings; please judge the voices, the false tape and the phone call by ear.
- **Safari and real Mac performance are still untested.** Please run the F4 benchmark (Phase 2) again, since content has been added.
- **No save or load.** Story state is in memory only (Phase 6).
- **Shown counts hint at missing evidence.** The timeline shows question marks for missing key events; this is deliberate but is a design choice you may want to revisit.
- **Chapter 5 has no encounter**, by design.
- **Prologue is skippable but not pausable mid-audio.** Pausing the game pauses the story clock, but a line of recording already playing continues for a few seconds.

## Performance impact
Added: about 7 MB of estimated texture memory (48 MB total) and about 50 kB of JavaScript (main chunk 307 kB gzipped; build 2.0 MB).
Mesh count rose from about 465 to 482. CPU time per render call in four spots measured 0.1 to 0.8 ms. GPU frame times are **not measured** (the browser pane throttles). The first load on a cold shader cache took about 6 s here, compared with about 4 s before, because more materials are pre-compiled behind the loading screen.
