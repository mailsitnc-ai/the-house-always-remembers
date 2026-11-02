# Ending conditions (Phase 6)

All logic lives in `src/story/Endings.ts` and is deterministic. The player never sees a score: a line of dialogue is offered
only if Daniel knows enough to mean it. Test hook (dev builds): `__debug.facts()` returns the live facts.

## Facts (derived from state, never stored)
| Fact | True when |
|---|---|
| `reconstructed` | the night-order puzzle is solved (always true by chapter 8) |
| `memoriesDoubted` | how many of Daniel's six false memories have been doubted or refuted by evidence |
| `responsibility` | `reconstructed` and `memoriesDoubted >= 4` |
| `tapeExposed` | the voice-comparison puzzle is solved |
| `motiveClues` | how many of `house-statement`, `parish-letter`, `emily-room-note` are found |
| `mirrorSeen`, `bodySeen` | the mirror scene and Emily's room have been seen (skipping a scene still counts it as seen) |
| `understandsMatron` | `tapeExposed` and `bodySeen` and `mirrorSeen` and `motiveClues >= 2` |

## The confrontation (three rounds)
| Round | Choices offered | Leads to |
|---|---|---|
| Offer | "Take me to her room." (always) · "I don't know what happened." (always) · "That isn't what happened." (needs `responsibility`) | stay → **Denial**; any other → Comfort |
| Comfort | "Stay." (always) · "I did this. I'm sorry." (needs `responsibility`) or "I can't look at it." (without it) | own → Plan; any other → **Denial** |
| Plan | "Then it's mine to carry. Let it end here." (always) · "No. But you don't get to decide what I do with it." (needs `understandsMatron`) | accept → **Recognition**; refuse → **True** |

## What the Matron says in the Plan round
She never explains the whole plan unprompted. A player who has not worked it out hears only that Daniel "carries something that is worth something to someone who can use it". Only a player whose facts satisfy `understandsMatron` also hears her confirm it ("a road", "it will not be Emily who gets up", "I want what she left behind"). Denial never reaches this round, and Recognition hears only the vague version.

## Endings
- **Denial / The Escape.** Reachable by choosing comfort at any point, or by not knowing enough to say anything else. The
  Matron leads Daniel to the remembered room; it is empty; the light fails; he is back in the foyer; the telephone rings
  ("Daniel? Why did you leave me alone?").
- **Recognition / The Confession.** Needs `responsibility` and the choices that own it, but not the full understanding.
  Dawn, Daniel leaves, one upstairs window is lit and she stands behind it.
- **True / The House Always Remembers.** Needs `understandsMatron` as well. The reconstructed room destabilises, she is gone,
  dawn, credits, then the telephone rings in the empty house and nobody speaks.

Optional evidence matters only through the two thresholds above: two of the three motive clues, and four doubted memories.
No single optional item is required, and the player can miss most of them.
