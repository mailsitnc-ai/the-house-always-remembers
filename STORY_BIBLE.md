# STORY BIBLE — THE HOUSE ALWAYS REMEMBERS

*You can bury the truth. You cannot make it forget.*

Status: the approved story direction for Phases 6 and 7. Sections 1 to 6 record what is already established in the game and in earlier briefs. Section 7 onward is the **new approved direction** (the Matron's true objective and three set-pieces). Nothing here has been implemented. This document changes no gameplay.

**Labels used.** *Established* means it is in earlier briefs or already in the game. *New direction* means approved in the latest brief. *Proposal* means my suggestion to make the new direction fit; it needs the owner's confirmation before being treated as canon.

---

## 1. Fixed canon (do not contradict)

- **Daniel** is 24. Eleven years ago he was 13 and his younger sister **Emily** was 8.
- Daniel loved Emily but resented having to look after her. After an argument one evening he made a **reckless decision**. Emily was put in serious danger. He panicked and **delayed seeking help** because he feared the consequences. Emily died. He did not intend it, but he was responsible for the decision and the delay.
- The family fractured and the house was abandoned. For eleven years Daniel avoided the memories and built a **false version of events**.
- **The exact mechanism and location of the accident are undecided. They must never be invented, stated or implied.** This includes the new body material below.
- The story stays emotionally powerful and **non-graphic**. Ordinary family evidence matters as much as the supernatural.
- He returns after a telephone call in Emily's voice. The call's wording is currently: **"Why did you leave me, Daniel?"** (changed in Phase 5 from "Daniel, why did you leave me alone?"; flagged for the owner's confirmation).
- The house is strangely preserved: lights work, the television plays, dinner seems prepared, sounds come from upstairs.
- The story must not suggest that accountability means endless self-punishment (see section 6).

## 2. The family and the evidence (established in Phase 3)

- Parents **Anna** and **Richard**. Emily called Daniel "Dan-Dan". Mum's calendar reads "Daniel in charge" with two exclamation marks.
- The evening timeline has a **permanent gap from 7:08 to 8:20 pm**. It is never filled in.
- Six **false memories** (m1 to m6) are Daniel's constructed version: there were five of us in the photograph; I wasn't there when it happened; Emily and I never fought; Emily forgave me; nobody ever knew; I called for help the moment I could. Verified evidence contradicts them.
- **The fifth-figure contradiction (must stay exactly as established):** the living-room frame shows **five** figures (someone tall stands behind the family); the album original shows **four**. The living-room print carries lab stamp 0412.
- Evidence includes the siblings photograph, school photo, teddy, drawings, Santa letter, reading chart, calendar, the answering-machine messages, phone bill, Mum's letter and unsent letter, Dad's dictaphone, the funeral card, the false tape and its analysis, and others in `src/story/StoryData.ts`.
- Two evidence puzzles exist: the **voice comparison** and the **night order**. The Phase 1 keypad puzzle also remains.

## 3. The eight chapters (fixed names and order)

1. PROLOGUE — THE TELEPHONE
2. HOMECOMING
3. THE UPSTAIRS ROOM
4. FAMILY PORTRAITS
5. THE MATRON
6. ELEVEN YEARS AGO
7. THE MISSING NIGHT
8. THE LAST DOOR

## 4. The Matron (established)

- An ancient supernatural entity. **Real**, not imagined and not created by Daniel's mind.
- Drawn to places and people where powerful guilt is buried under denial.
- Usually appears as a tall, imposing, maternal woman (2.35 m, long dark-green dress, lace collar, hair in a bun). **Calm, maternal, controlling.** Unnaturally still. Never hurried, never loud.
- Presents herself as protective and caring while being controlling and manipulative. Speaks in **half-truths** ("You were upstairs. You were asleep.").
- **Established powers:** reconstruct rooms, imitate voices, manipulate objects, influence the house, appear physically.
- **Established limits (the rules ledger, section 10):** she cannot rewrite historical events; **truth and verified evidence weaken her**; she cannot erase every clue or force Daniel to believe her; in the game she cannot enter lamplight; she cannot become Emily; her pursuit has so far been non-lethal.
- Her stated aim until now: keep Daniel **trapped between denial and guilt**, because she feeds on that cycle.

## 5. The other entities (established, preserved)

| Entity | Meaning | Rules |
|---|---|---|
| **The Hollow** | Denial | Shadowy humanoid figures. Interfere with clues and appear in incomplete-memory areas; veil evidence until cleared with the flashlight. Moves in sudden jumps. |
| **The Witness** | Memory and truth | Silent, distant, never attacks. Appears near important evidence. Redesigned in Phase 5 as an amber, grainy long-exposure figure with a cyan afterimage, holding a small photograph. Shy. |
| **The Unremembered** | Fragments of incomplete memories | Appear in Emily-related locations. **Not Emily and not the Matron.** |

## 6. The three endings (established names; meanings partly established)

Names, from the original brief:
1. **DENIAL / THE ESCAPE**
2. **RECOGNITION / THE CONFESSION**
3. **TRUE ENDING / THE HOUSE ALWAYS REMEMBERS**

What is established: the best ending requires Daniel to **understand what happened, accept responsibility, and understand the Matron's manipulation**. Accountability must never read as endless self-punishment. Endings are implemented in Phase 6.

The owner has now confirmed the meanings below (Phase 6 final pass). Chapter 8 ends in a chase: after the confrontation Daniel refuses her, she stops pretending (the 21-second transformation), the objective becomes RUN, and the house is the arena. Being caught resolves to Denial or Recognition by what Daniel said and knew, never by chance; reaching the front door and solving the anchor puzzle is the True Ending. See `docs/ENDINGS.md`:

| Ending | Daniel's state | What happens to the Matron's plan |
|---|---|---|
| Denial / The Escape | Daniel yields to her promise of his family (by choosing comfort, or by being caught in the chase after evading her) | **The plan succeeds.** He gives himself willingly as the bridge; the ritual spends him (he dies). The Matron leaves her entity form for Emily's preserved body and walks out of the front door that never opened for Daniel. |
| Recognition / The Confession | Faces what he did and accepts responsibility, but does not understand the Matron's manipulation (accepts her offer to carry it, or is caught after answering honestly all the way) | He is honest about the past but is still her anchor without knowing it; the plan is left unresolved. Dawn; one upstairs window lit. |
| **True / The House Always Remembers** | Understands the truth, accepts responsibility without self-punishment, survives the chase and breaks what ties her to the house | **The plan fails.** He takes her out of the family photograph (the original print replaces the false one), the front door is no longer held shut, and he walks out. |

---

## 7. NEW DIRECTION — the Matron's true objective

*(Approved. It strengthens the existing story and replaces none of it.)*

The Matron is an ancient entity attracted to **emotional anchor points**: places and people where grief, guilt, attachment and unresolved memory create a powerful connection between the living and the dead. She does not merely feed on guilt. She uses those connections to establish **a route into a physical vessel**.

### 7.1 Emily's body (CONFIRMED CANON)
- Emily died eleven years ago, aged eight, and **was buried. She was not cremated.** The family grieved and held a funeral; the order of service is in the suitcase.
- **The Matron subsequently found Emily's body and has preserved it ever since.** It is the physical vessel she intends to possess. Nothing in the game, journal, timeline or endings may say or imply that Emily was cremated or that her body was destroyed.
- **Daniel is the bridge; Emily's preserved body is the vessel.** The Matron does not want to resurrect Emily, and she does not become Emily in identity. She can imitate Emily's voice and mannerisms, imperfectly, and she remains the Matron.
- It is a central part of the mystery and is **foreshadowed**, not announced: through clues, environmental storytelling, unusual preservation-related details and increasingly disturbing discoveries. **It must not be revealed too early, and never in one long speech.**
- The eventual discovery (Emily's preserved body in her room) must be emotionally powerful and disturbing, **not gratuitously graphic**: Emily is clearly deceased, still, and unharmed. **Owner direction (Phase 6 final pass):** the Denial ending is the one place the game is graphic, and only about Daniel: his body after the ritual is shown with severe injuries and blood. Emily's body is never shown injured.
- It fits the established rules: the death and the burial are historical events she cannot rewrite; she took what was left afterwards. **The place where the body is kept must not suggest where the accident happened**, and the story must not explain how Emily died.

### 7.2 Daniel's role
- Daniel is not just another victim who returned. His **guilt, memories and attachment to Emily make him the emotional anchor the Matron needs.**
- She **deliberately encouraged his return**. The phone call is hers (she can imitate voices).
- Her apparent protection of Daniel and Emily was **never affection**. She was preparing the conditions for her plan.

### 7.3 How the plan works (the consistent logic)
1. A vessel alone is empty. The Matron cannot simply wear it: she needs a living **bridge** between the dead girl and herself.
2. The bridge is **Daniel's emotional connection to Emily**: his guilt, his memories, his attachment. These make a route that the Matron can travel along.
3. The bridge only holds while Daniel is **held in the denial-and-guilt cycle** (her established aim). Denial keeps the anchor unresolved; guilt keeps it strong. That is why she has kept him there for eleven years, and why she needs him to **come back** and walk through the house's memories while she steers them.
4. The completed bridge would let her possess Emily's preserved body. The body is the vessel and Daniel is only the bridge. **Updated canon (Denial ending only):** a bridge can be crossed once. If Daniel gives himself up willingly, the ritual spends him and he dies; his death is the price of her crossing. If he does not, nothing happens to his body. The one inside would be the Matron, **never Emily returning**. This keeps the established rule that she cannot become Emily on her own: she can only do it through the vessel and the anchor.
5. **Why the existing rules still hold.** She uses only established powers: reconstructing rooms, imitating voices, steering memories, influencing the house. She still cannot rewrite history (the death stands; she only preserves what remains) and still cannot make Daniel believe what the evidence contradicts. No new power is introduced.

### 7.4 The final revelation: what the player gradually discovers
1. The Matron has been manipulating Daniel for eleven years.
2. Emily's body has been preserved.
3. The Matron needs Daniel's emotional connection to Emily.
4. Daniel's return was deliberately engineered.
5. She intends to use Daniel as the connection that lets her inhabit Emily's body.

The player must be able to **work out the plan from clues before the final confrontation**, so that the confrontation confirms it rather than introducing it.

### 7.5 Clue ladder (a proposal for pacing, tied to the existing chapters)
| Chapter | Clue type (all subtle until the last rungs) |
|---|---|
| 2 HOMECOMING | The house is kept: lights work, dinner is laid. Someone is maintaining it. Nothing in Emily's room has aged. |
| 3 THE UPSTAIRS ROOM | Emily's room is colder and cleaner than any other. A faint, sweet, chemical smell on the landing that does not belong to the old house. |
| 4 FAMILY PORTRAITS | The tall fifth figure in the living-room photo: someone was close to the family. The Hollow veils certain objects. |
| 5 THE MATRON | She is protective of Emily's things and of Emily's room specifically. Her half-truths always steer Daniel toward guilt and away from the evidence. |
| 6 ELEVEN YEARS AGO | The order of service shows there was a funeral. A parish letter, never answered, says the plot where Emily was laid to rest was found disturbed the following spring. A standing order pays for the house and no one will say who. These are small and unexplained: the player learns that Emily was buried and that something happened to her grave, not why. |
| 6 to 7 | Mum's note about Emily's room (lavender, camphor, cold, tended by someone) and the standing order point the same way as the parish letter: whatever tends the house is interested in Emily herself. This is the middle stage: the Matron's interest is not only about guilt. |
| 7 THE MISSING NIGHT | The phone-line evidence shows the call that brought Daniel back was placed from inside the house. The permanent 7:08 to 8:20 gap stays unfilled, and the accident is never explained. The mirror sequence (set-piece C) and the discovery of Emily's remains (set-piece A) fall late in this chapter. |
| 8 THE LAST DOOR | The player now understands the plan. The confrontation (set-piece B) and the ending. |

The Hollow's veils can hide preservation clues (denial protecting her plan). The Witness stands near the clues that expose it. The Unremembered's fragments are residue of the incomplete memories that make the bridge, **not** Emily.

---

## 8. How the true ending defeats the plan (requirement)

The true ending must **prevent the Matron from using Daniel as the bridge**.

Logic that follows from the established rules: truth and verified evidence weaken her; the bridge depends on denial and guilt held in a cycle. When Daniel understands what happened, accepts responsibility **without** punishing himself forever, and sees that his guilt was being farmed, his attachment turns from an unresolved anchor into grief and release. That is something she cannot travel along. The player **proves** the truth by presenting verified evidence, not by a power that appears from nowhere. Emily is allowed to rest. The Matron is left with an empty vessel and no route.

Required: the true ending must show this, and must not read as Daniel punishing himself or being forgiven by a convenient ghost.

---

## 9. NEW DIRECTION — three major horror set-pieces (design requirements for later phases, **not implemented**)

### A. Emily's remains
- **When.** After Daniel has uncovered enough of his memories (late chapter 7, proposal). One of the most disturbing moments of the game.
- **How it is shown.** Cinematic composition, partial visibility, shadow, environmental storytelling, unsettling sound and **Daniel's reaction**. The emotional impact and the revelation matter more than injury detail. **No gratuitous graphic imagery.**
- **What the player must understand.** This is **Emily**, and the Matron has **kept her preserved**. The player must be able to tell this without being shown gore.
- Suggested tools: a small, still, carefully lit space; something cared for (arranged, covered, tended) that is wrong because of the care; a glimpse, a hand, a familiar object (the teddy, a ribbon), then Daniel's face; the Matron's tending marks everywhere. Restraint is the point.
- Must not imply the location or mechanism of the accident.

### B. The Matron versus Daniel
- **When.** Chapter 8, THE LAST DOOR. The Matron **stops pretending** to be a protector. She is physically imposing and **genuinely dangerous**.
- **Combines:** cinematic presentation; environmental manipulation (reconstructing rooms and doors, which is already established); a frightening physical presence; a clear objective for the player; **player-controlled escape, evasion or survival**; dialogue that reveals her intentions.
- **Not a combat game.** Fits the established design: she cannot enter lamplight, truth weakens her, and she moves at one steady, deliberate pace. The danger is that she can corner Daniel and begin the bridge; being caught advances the bridge rather than killing him.
- *Proposal for the objective:* reach Emily and break the anchor, using lamplight as refuges and verified evidence to stagger her, while the house reshapes around Daniel. Her speech reveals the plan in her own calm, exact voice (see `VOICE_DIRECTION.md`); she is not theatrical.
- Should be skippable-safe and fair, in line with the game's non-lethal tradition. **Updated (Phase 6 final pass):** the confrontation is followed by a real first-person chase (the objective changes to RUN). She runs him down through the house; lit rooms are still refuges (she cannot cross lamplight); lamps fail with a warning and come back; she is a little slower than a running player. If she catches him, the Denial or Recognition ending follows by his decisions. The way out is the front door, which has been blocked since the first minute of the game ("Something is on the other side."): the fifth figure in the family photograph stands at that door, and the house holds it shut from inside. Replacing the false photograph with the original print (found in the study album) breaks the connection and the door opens: the True Ending.

### C. Daniel's reflection
- **When.** A major mirror sequence (late chapter 6 or 7, proposal). The existing bathroom mirror cabinet is a natural place.
- Daniel looks into a mirror and sees **a monstrous version of himself**: recognisably Daniel, distorted into something frightening. It represents his guilt, his self-perception and the Matron's manipulation of his memories.
- It **behaves unnaturally and may move independently of Daniel.**
- **Distinct visual identity.** It must not read as a generic monster or as one of the existing entities (the Hollow's smoke, the Witness's amber grain, the Unremembered's strips, the Matron's green dress). *Proposal:* it is Daniel's own figure in his own clothes and face, stretched, with the wrongness located in behaviour and timing (it lags, then leads, then holds still while he moves) and in a cold, desaturated look with a dark, wet-looking edge, so it feels like a corrupted copy of him. Its hands and face should echo how Daniel actually holds himself.
- Must have a clear story meaning: his guilt *as the Matron has been shaping it*, which is distorted past what really happened. **As built:** it is Daniel himself (face, hair, build, maroon knit, jeans) and begins as an exact reflection, then lags, then has its own timing, keeps looking at him when he looks away, goes slack-mouthed, stretches, comes to the glass and raises its hands.
- Performance note for the Mac Neo: avoid a full real-time planar reflection of the whole house; a single mirror with a cheap, controlled render is enough.

---

## 10. Rules ledger (do not add contradictory powers)

**She can:** reconstruct rooms; imitate voices (including Emily's); manipulate objects; influence the house; appear physically; speak half-truths; steer Daniel through his memories; preserve what already exists; attract and use emotional anchors.
**She cannot:** rewrite historical events; erase every clue; force Daniel to believe what the evidence contradicts; become Emily by herself (she can only use the vessel through the anchor); enter lamplight (in-game rule); be defeated by violence.
**Truth and verified evidence weaken her.** This is the engine of the true ending.

## 11. Preserved story elements checklist

- Sibling relationship and the eleven-year gap
- Daniel's reckless decision and delayed attempt to get help
- The Matron's established personality and supernatural rules
- The Hollow, the Witness and the Unremembered
- The eight chapter names and order
- The three endings and their meanings (names fixed; detail to be confirmed, see section 6)
- Accepting responsibility is not endless self-punishment
- The accident's mechanism and location: **undecided**, never invented

## 12. Open questions for the owner

1. Confirm the phone line: "Why did you leave me, Daniel?"
2. ~~Emily's burial and the body later taken~~ **Confirmed as canon** (section 7.1).
3. Confirm or change the proposed ending meanings (section 6).
4. Confirm the placement of the three set-pieces (chapters 6, 7 and 8).
5. Confirm whether the tall fifth figure in the living-room photo is meant to be the Matron (a natural reading, not yet decided).


**Chase update (final polish pass).** In the Chapter 8 chase the Matron can now take hold of Daniel; he has ten seconds to break her grip (a short sequence of arrows). Breaking free resumes the chase; being held for the full ten seconds ends it and the evidence-based ending (Denial or Recognition, see `docs/ENDINGS.md`) follows. Ending canon is unchanged.

## The family photographs (visual specification, final polish)
- Taken on the front step of the house eleven years before the game: **Dad, Mum, Daniel (13) and Emily (8)**, the same four faces in every print (`CAST` in `src/world/PhotoPainter.ts`). Daniel and Emily are drawn with a child's proportions.
- **Living-room frame** (west wall, the one the opening objective sends the player to): the four of them **plus the fifth figure**, tall, dark, in the doorway shadow behind them. Pencil on the back: "The step, summer. All of us." Lab stamp No. 0412.
- **Original print** (study album) and the other family prints (upstairs landing): the **same four only**, the door shut, the step empty. The Matron never altered the print; the fifth figure exists only in the framed copy on the wall. In the True Ending the print replaces the framed copy and the wall then shows four.
- The second frame that used to hang beside it in the living room (two children) was mistaken for the family photograph; it now shows the house from the lane, empty. The two-children photograph remains in the opening and upstairs (evidence `siblings-photo`).
