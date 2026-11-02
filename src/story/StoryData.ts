/**
 * All story content for Phase 3, as data. Systems read this; they contain no story text of their own.
 *
 * Canon guard: nothing here states or implies how or where Emily's accident happened. The hour between the last
 * recording of Emily and the first call for help is a deliberate gap that Phase 3 never fills.
 */

export type EvidenceKind = "document" | "photograph" | "object" | "recording" | "drawing";

export interface EvidenceDef {
  id: string;
  kind: EvidenceKind;
  title: string;
  /** Where it is found, shown in the journal. */
  where: string;
  /** One line for the list. */
  summary: string;
  /** Full description shown in the journal. */
  detail: string;
  /** Optional evidence rewards exploration but never blocks progress. */
  optional?: boolean;
  /** Daniel's passing thought when this is first found. */
  thought?: string;
  /** Recording id, for recordings. */
  recording?: string;
  /** Reveals what the Matron is doing. Optional, and two of the three are enough to understand her plan. */
  motive?: boolean;
}

export interface TimelineEventDef {
  id: string;
  lane: "night" | "after";
  /** Shown beside the event. */
  time: string;
  /** Sort key within the lane. */
  order: number;
  text: string;
  /** Evidence that establishes this event. */
  evidence: string;
  /** Needed to reconstruct the night. */
  essential?: boolean;
}

export interface RecollectionDef {
  id: string;
  /** Daniel's version, in his own words. */
  text: string;
  /** Spoken thought when it surfaces. */
  thought: string;
  /** Evidence ids that contradict it. One makes it doubted; all of them refute it. */
  contradictedBy: string[];
}

export const EVIDENCE: EvidenceDef[] = [
  // ---- the photographs ----
  {
    id: "living-photo",
    kind: "photograph",
    title: "The living room photograph",
    where: "Living room, framed on the wall",
    summary: "Five figures on the front step. The fifth stands behind the rest.",
    detail:
      "Five figures on the front step in summer light. Four of them are close together. The fifth stands behind them, taller than any of the others, and the face is hard to find. On the backing paper, in pencil: 'The step, summer. All of us.' A photo-lab stamp reads No. 0412.",
    thought: "I remember someone standing behind us. I always have.",
  },
  {
    id: "album-print",
    kind: "photograph",
    title: "The original print",
    where: "Study, the family album",
    summary: "The same photograph, the same stamp, No. 0412. Four people.",
    detail:
      "From the family album: the same step, the same lab stamp, No. 0412. A man, a woman, a boy of about twelve and a girl of about seven. Nobody stands behind them. The door at their backs is shut, and the step beside it is empty.",
    thought: "There's no one behind us. There never was.",
  },
  // ---- the evening ----
  {
    id: "kitchen-note",
    kind: "document",
    title: "Mum's note by the kettle",
    where: "Kitchen worktop",
    summary: "'Back by 9. Look after Em.'",
    detail:
      "'Back by 9. Dinner in the oven, 35 mins. Don't let Em eat it cold. Look after her. Love Mum x'. Underneath, in different ink, in Dad's handwriting: 'Chips on the way home?'",
    thought: "She wrote 'look after her'. I read it. I know I read it.",
  },
  {
    id: "emily-recorder",
    kind: "recording",
    recording: "em3",
    title: "Emily's toy recorder: 'EM 3'",
    where: "Emily's room, on her small desk",
    summary: "The last tape. A pencil label reads 'Fri 7:05'.",
    detail:
      "Emily's toy recorder, the kind with a built-in microphone and a button she was allowed to press herself. The tape is labelled in pencil: 'EM 3, Fri 7:05'. The recording is of her and Daniel arguing in the house.",
    thought: "That's me. That's my voice.",
  },
  {
    id: "machine-msg3",
    kind: "recording",
    recording: "msg3",
    title: "Answering machine: message 3, 8:20 pm",
    where: "Rear passage, the telephone table",
    summary: "Dad rings the house. Nobody picks up.",
    detail:
      "The machine stamps each message. This one is 8:20 pm, Friday. Dad rings the house, asks whoever is there to pick up, and gets the machine. Nobody answered.",
  },
  {
    id: "phone-bill",
    kind: "document",
    title: "Itemised telephone bill",
    where: "Study, desk drawer",
    summary: "The only outgoing call that evening: 8:51 pm.",
    detail:
      "An itemised bill for the month. Most lines are Nana, on Sundays. For the Friday there is a single outgoing call in the evening: 20:51, the emergency number, 0 min 42 s.",
  },
  {
    id: "anna-letter",
    kind: "document",
    title: "Mum's letter to Dad (never sent)",
    where: "Storage room, in the old suitcase",
    summary: "Mum knew Daniel was in the house.",
    detail:
      "'Rick, I'm writing this because I can't say it out loud in the same room as Daniel. He was there. I know you've been trying not to know it, but he told me in the car, all in one go, and then not another word. He was in the house the whole time. We can't ask him again. He's thirteen and he is already carrying it. If we make him say it twice I think we lose him as well. Leave it with me. A.'",
    thought: "They knew. Mum knew the whole time.",
  },
  // ---- the voice ----
  {
    id: "fake-tape",
    kind: "recording",
    recording: "fake",
    title: "A tape labelled 'FOR DANIEL'",
    where: "Study, the tape deck",
    summary: "Emily's voice. Something about it is wrong.",
    detail:
      "A cassette in a hand that looks like Emily's but is too neat. It was not in the deck before. The voice on it is Emily's, or very close to it.",
  },
  {
    id: "tape-analysis",
    kind: "document",
    title: "It was not Emily",
    where: "Your own comparison of the tapes",
    summary: "She never talked like that.",
    detail:
      "On every genuine tape Emily calls you 'Dan-Dan', says 'bestest', says 'sorry' and 'I'm not mad'. She never says 'forgive', never says 'nobody's fault', never says 'don't remember'. Whatever made this tape had her voice, and none of her words.",
    thought: "She never once called me Daniel.",
  },
  // ---- optional: the genuine family tapes ----
  {
    id: "birthday-tape",
    kind: "recording",
    recording: "birthday",
    optional: true,
    title: "Tape: Emily's seventh birthday",
    where: "Study, the tape deck",
    summary: "Dad's recording of the candles. Emily is laughing.",
    detail: "One of Dad's family tapes, labelled in his square capitals: 'EM 7 — CANDLES'.",
  },
  {
    id: "christmas-tape",
    kind: "recording",
    recording: "christmas",
    optional: true,
    title: "Tape: Christmas morning",
    where: "Living room, the cassette player",
    summary: "Emily finds out Santa ate the carrot.",
    detail: "Labelled 'XMAS — EM + DAN' in Mum's handwriting. Younger voices, a lot of paper tearing.",
  },
  // ---- optional: the house and the family ----
  {
    id: "calendar",
    kind: "document",
    optional: true,
    title: "The kitchen calendar",
    where: "Kitchen wall",
    summary: "October. One Friday circled.",
    detail:
      "A wall calendar stopped on October. Most days carry a pencilled initial: D, E, M. One Friday is circled and written in: 'Leaving do 6pm. Back late. Daniel in charge!!'",
  },
  {
    id: "shopping-list",
    kind: "document",
    optional: true,
    title: "Shopping list on the fridge",
    where: "Kitchen, the fridge door",
    summary: "Batteries for the torch, underlined twice.",
    detail: "A shopping list in neat handwriting: milk, bread and eggs, apples, batteries (torch!), light bulbs. The torch is underlined twice.",
  },
  {
    id: "dining-chair",
    kind: "object",
    optional: true,
    title: "The pulled-out chair",
    where: "Dining room",
    summary: "Four places laid. One chair left out.",
    detail:
      "The table is laid for four and nobody sat down. One chair is pushed out at an angle, the way a child leaves a chair when she has been called away from dinner. Dust lies over everything except the seat.",
  },
  {
    id: "machine-msgs12",
    kind: "recording",
    recording: "msgs12",
    optional: true,
    title: "Answering machine: messages 1 and 2",
    where: "Rear passage, the telephone table",
    summary: "Emily's teacher. Nana.",
    detail: "Two ordinary messages from the afternoon: Emily's teacher about her reading chart, and Nana asking someone to ring on Sunday.",
  },
  {
    id: "reading-chart",
    kind: "document",
    optional: true,
    title: "Emily's reading chart",
    where: "Emily's room, dresser drawer",
    summary: "Five stars. 'Well done, Emily!'",
    detail: "A school reading chart with a row of gold star stickers. At the bottom a teacher has written 'Well done, Emily!' and Emily has added, underneath, 'I read the most.'",
  },
  {
    id: "santa-letter",
    kind: "document",
    optional: true,
    title: "Emily's letter to Santa",
    where: "Emily's room, small desk",
    summary: "A bicycle and a kitten.",
    detail: "A letter in careful pencil asking for a bicycle and a kitten. It ends: 'and one for Dan-Dan too. From Emily (8)'. It was never posted.",
  },
  {
    id: "drawing-house",
    kind: "drawing",
    optional: true,
    title: "Drawing: our house",
    where: "Emily's room, pinned to the wall",
    summary: "Four stick figures and a yellow dog.",
    detail: "A crayon drawing of this house, a smiling sun and four figures out the front. Two of them, the smallest and the next smallest, are holding hands. The tallest has been given enormous glasses and a very small mouth.",
  },
  {
    id: "drawing-horse",
    kind: "drawing",
    optional: true,
    title: "Drawing: a horse",
    where: "Emily's room, pinned to the wall",
    summary: "'MY HORSE.'",
    detail: "A brown horse with a very long neck. Underneath, in capitals: MY HORSE. At the edge, in a different crayon and a different hand: 'Very good. D.'",
  },
  {
    id: "drawing-rainbow",
    kind: "drawing",
    optional: true,
    title: "Drawing: rainbow",
    where: "Emily's room, pinned to the wall",
    summary: "Five colours. The purple ran out.",
    detail: "A rainbow in five colours. The purple crayon gave out halfway, and someone has finished the last band in biro.",
  },
  {
    id: "teddy",
    kind: "object",
    optional: true,
    title: "Emily's teddy bear",
    where: "Emily's room, on the bed",
    summary: "One ear sewn back on, badly.",
    detail: "A well-loved bear. One ear has been sewn back on with thread that does not quite match, in stitches too big for an adult. Daniel remembers doing it at the kitchen table, with his tongue between his teeth.",
  },
  {
    id: "siblings-photo",
    kind: "photograph",
    optional: true,
    title: "Photograph of two children",
    where: "Emily's room, on the wall",
    summary: "A girl holding a boy's sleeve.",
    detail: "Two children on a front step. The smaller one holds the other's sleeve, a little too tightly, as if afraid he might go.",
  },
  {
    id: "daniel-homework",
    kind: "document",
    optional: true,
    title: "Daniel's maths homework",
    where: "Daniel's room, desk",
    summary: "Half finished, due Friday.",
    detail: "Exercises 4 to 9. Number 7 has been rubbed out so many times the paper has gone thin.",
  },
  {
    id: "school-photo",
    kind: "photograph",
    optional: true,
    title: "School photograph",
    where: "Daniel's room, pinboard",
    summary: "Daniel in the front row, smiling.",
    detail: "A class photograph. Daniel is in the front row, grinning, with his tie crooked. On the back, in his mother's handwriting, his name and a year.",
  },
  // ---- optional: afterwards ----
  {
    id: "dictaphone",
    kind: "recording",
    recording: "dictaphone",
    optional: true,
    title: "Dad's dictaphone note",
    where: "Study, the tape deck",
    summary: "Dad, early on a Saturday morning.",
    detail: "A short tape in Dad's square capitals: 'NOTE TO SELF'. Recorded very early in the morning.",
  },
  {
    id: "funeral-card",
    kind: "document",
    optional: true,
    title: "Order of service",
    where: "Storage room, in the old suitcase",
    summary: "'Emily Rose. Ever so loved.'",
    detail: "A folded order of service. 'Emily Rose. Ever so loved. Ever so missed.' Inside the cover, in a boy's handwriting, someone has written 'Sorry' and then crossed it out, and then written it again.",
  },
  {
    id: "anna-unsent",
    kind: "document",
    optional: true,
    title: "Mum's letter to Daniel (never sent)",
    where: "Storage room, in the old suitcase",
    summary: "Written years later. It does not blame him.",
    detail:
      "'Daniel, you were thirteen. You made a choice in a bad moment, and then another, and you have been paying for both ever since. I am not asking you to pay any more. I never needed you to say it for me to know. I only needed you to stop being alone with it. The door of this house is open to you. It always will be. Mum'",
  },
  // ---- Phase 6: what the Matron has been doing. Optional; none required alone. ----
  {
    id: "house-statement",
    kind: "document",
    optional: true,
    motive: true,
    title: "Bank statement: a standing order",
    where: "Storage room, in the old suitcase",
    summary: "The house has been paid for, every month, by no one named.",
    detail:
      "A statement addressed to Richard. Every month since the autumn Emily died, the same entry: 'HOUSEKEEPING. Upkeep of the property, as instructed.' The account holder's name is blank. Someone has written in the margin: 'Who is paying this? It stops nowhere.'",
  },
  {
    id: "parish-letter",
    kind: "document",
    optional: true,
    motive: true,
    title: "Letter from the parish office",
    where: "Storage room, in the old suitcase",
    summary: "A formal letter about the plot where Emily was laid to rest.",
    detail:
      "On the parish office's paper, never answered: 'To the family of Emily Rose. We write regarding the churchyard plot in which Emily was laid to rest last autumn. During routine work this spring our groundsman found the plot disturbed, and we believe the matter needs your attention. We should be grateful if you would telephone the office or call in at your convenience. We have been unable to reach you at the address we hold. With our sincere sympathy.'",
  },
  {
    id: "emily-room-note",
    kind: "document",
    optional: true,
    motive: true,
    title: "Mum's note on the dresser",
    where: "Emily's bedroom, on the dresser",
    summary: "'Lavender and camphor. I haven't bought either.'",
    detail:
      "In Mum's handwriting, years old: 'Rick. Lavender and camphor in Emily's room again. I have not bought either. The room is cold when the house is warm. Someone is looking after it, and I do not want to know who. A.'",
  },
];

export const TIMELINE: TimelineEventDef[] = [
  { id: "n1", lane: "night", order: 1, time: "Before 6 pm", essential: true, evidence: "kitchen-note", text: "Mum and Dad go out for the evening. Daniel is left in charge of Emily." },
  { id: "n2", lane: "night", order: 2, time: "7:05 pm", essential: true, evidence: "emily-recorder", text: "Emily records her last tape. She and Daniel are arguing." },
  { id: "n4", lane: "night", order: 4, time: "8:20 pm", essential: true, evidence: "machine-msg3", text: "Dad rings the house. Nobody picks up." },
  { id: "n5", lane: "night", order: 5, time: "8:51 pm", essential: true, evidence: "phone-bill", text: "Someone in the house calls for help." },
  { id: "n6", lane: "night", order: 6, time: "About 9:10 pm", essential: true, evidence: "anna-letter", text: "Mum and Dad come home. Daniel is in the house." },
  { id: "a1", lane: "after", order: 1, time: "The next day", evidence: "anna-letter", text: "Mum writes to Dad: Daniel was there. They agree not to ask him." },
  { id: "a2", lane: "after", order: 2, time: "Early Saturday", evidence: "dictaphone", text: "Dad records a note to himself. He decides it is best left alone." },
  { id: "a3", lane: "after", order: 3, time: "Some days later", evidence: "funeral-card", text: "A service is held for Emily." },
  { id: "a5", lane: "after", order: 4, time: "The following spring", evidence: "parish-letter", text: "The parish writes about the plot where Emily was laid to rest, which has been found disturbed. The letter is never answered." },
  { id: "a4", lane: "after", order: 5, time: "Years later", evidence: "anna-unsent", text: "Mum writes to Daniel and does not send it." },
];

/** The stretch between the last recording of Emily and the first sign of anyone else. Phase 3 never fills it. */
export const TIMELINE_GAP = { time: "7:08 pm to 8:20 pm", text: "Nobody wrote this part down. Nobody has said it." };

export const RECOLLECTIONS: RecollectionDef[] = [
  { id: "m1", text: "There were five of us in the family photograph. Someone tall stood behind us.", thought: "There were five of us. I can see exactly where the fifth one stood.", contradictedBy: ["album-print"] },
  { id: "m2", text: "I wasn't at home when it happened. I came back to it already over.", thought: "I wasn't there. I came home afterwards. That is how it was.", contradictedBy: ["emily-recorder", "anna-letter"] },
  { id: "m3", text: "Emily and I never fought. We always got along.", thought: "We never fought. Not really. Not ever.", contradictedBy: ["emily-recorder"] },
  { id: "m4", text: "Emily forgave me. She told me it wasn't my fault.", thought: "She forgave me. She said so.", contradictedBy: ["tape-analysis"] },
  { id: "m5", text: "Nobody ever knew. Mum and Dad never asked, so they never knew.", thought: "They never asked. So they never knew.", contradictedBy: ["anna-letter"] },
  { id: "m6", text: "I called for help the moment I could.", thought: "I called as soon as I could. As soon as I could.", contradictedBy: ["machine-msg3", "phone-bill"] },
];

export interface ChapterDef {
  number: number;
  title: string;
  objective: string;
}

/** Chapter names and order are fixed by the design. */
export const CHAPTERS: ChapterDef[] = [
  { number: 1, title: "PROLOGUE — THE TELEPHONE", objective: "" },
  { number: 2, title: "HOMECOMING", objective: "Look through the ground floor. Something here is not as you remember it. Read what the family left." },
  { number: 3, title: "THE UPSTAIRS ROOM", objective: "Find Emily's room. Look at what she left there, and listen to what she recorded." },
  { number: 4, title: "FAMILY PORTRAITS", objective: "The photograph in the living room and the family's own prints may not agree. Find where the family kept the originals." },
  { number: 5, title: "THE MATRON", objective: "Something has left a tape in the study. It speaks in Emily's voice. Find out whether it is her." },
  { number: 6, title: "ELEVEN YEARS AGO", objective: "Find out what your family did afterwards. Somewhere in the house there are things they packed away." },
  { number: 7, title: "THE MISSING NIGHT", objective: "Piece together the evening Emily was last heard from. Open the journal (J) and look at the timeline." },
  { number: 8, title: "THE LAST DOOR", objective: "You know most of what you came for. Something in the house has been waiting for you to understand it." },
];

export interface RecordingLine {
  speaker: string;
  /** Voice style key. */
  voice: "emily" | "daniel" | "inner" | "anna" | "richard" | "teacher" | "nana" | "fake" | "matron" | "whisper";
  text: string;
}

export interface RecordingDef {
  id: string;
  title: string;
  /** Genuine recordings are used as the comparison set for the false tape. */
  genuine?: boolean;
  /** "phone" and "tape" colour the sound differently. */
  /** How it sounds: a tape, a telephone line, an answering machine, someone in the room, or Daniel's own thoughts. */
  medium: "tape" | "phone" | "machine" | "room" | "inner";
  lines: RecordingLine[];
}

export const RECORDINGS: RecordingDef[] = [
  {
    id: "phonecall",
    title: "The telephone call",
    medium: "phone",
    lines: [
      { speaker: "Daniel", voice: "daniel", text: "Hello?" },
      { speaker: "Emily", voice: "emily", text: "Hi. It's me." },
      { speaker: "Emily", voice: "emily", text: "Why did you leave me, Daniel?" },
      { speaker: "Daniel", voice: "daniel", text: "Em?" },
    ],
  },
  // ---- Phase 5: the opening and Daniel's return. Backstory arrives a little at a time. ----
  {
    id: "open-vo",
    title: "Daniel, thinking",
    medium: "inner",
    lines: [
      { speaker: "Daniel", voice: "inner", text: "Eleven years. I stopped counting after the first." },
      { speaker: "Daniel", voice: "inner", text: "Em was eight. She followed me everywhere, and I let her." },
      { speaker: "Daniel", voice: "inner", text: "I told myself it was only a house." },
    ],
  },
  {
    id: "return-vo",
    title: "Daniel, at the gate",
    medium: "inner",
    lines: [
      { speaker: "Daniel", voice: "inner", text: "The same gate. The same crooked step." },
      { speaker: "Daniel", voice: "inner", text: "Nobody has lived here for years. So why is there a light on?" },
    ],
  },
  {
    id: "birthday",
    title: "Emily's seventh birthday",
    genuine: true,
    medium: "tape",
    lines: [
      { speaker: "Dad", voice: "richard", text: "Right, everyone. Candles. Say cheese, Em." },
      { speaker: "Emily", voice: "emily", text: "Dan-Dan, blow with me! It's the bestest cake!" },
      { speaker: "Daniel", voice: "daniel", text: "You blow, it's your birthday. I'll hold the plate." },
      { speaker: "Emily", voice: "emily", text: "'Cause I want you to. Pinky promise you'll do it with me." },
      { speaker: "Daniel", voice: "daniel", text: "Pinky promise. Go on, make a wish." },
    ],
  },
  {
    id: "christmas",
    title: "Christmas morning",
    genuine: true,
    medium: "tape",
    lines: [
      { speaker: "Emily", voice: "emily", text: "Dan-Dan, look, look, LOOK! Santa ate the carrot!" },
      { speaker: "Daniel", voice: "daniel", text: "It's just a carrot, Em. Mum probably did it." },
      { speaker: "Emily", voice: "emily", text: "No she didn't! I'm not mad at you for saying it, but she didn't." },
      { speaker: "Emily", voice: "emily", text: "Can you read me the story tonight? The bestest one?" },
      { speaker: "Daniel", voice: "daniel", text: "Fine. Pinky promise." },
    ],
  },
  {
    id: "em3",
    title: "Emily's toy recorder: EM 3",
    genuine: true,
    medium: "tape",
    lines: [
      { speaker: "Emily", voice: "emily", text: "Okay, recording. This is Emily, and I'm eight. Dan-Dan, say hi." },
      { speaker: "Daniel", voice: "daniel", text: "Em, not now." },
      { speaker: "Emily", voice: "emily", text: "But you promised. You pinky promised we'd play the spy game after dinner." },
      { speaker: "Daniel", voice: "daniel", text: "I never said after dinner. I said maybe." },
      { speaker: "Emily", voice: "emily", text: "You PROMISED, Dan-Dan! Pinky promise!" },
      { speaker: "Daniel", voice: "daniel", text: "Leave me alone, Em! I'm not your babysitter!" },
      { speaker: "Emily", voice: "emily", text: "You're mean. I'm telling Mummy." },
      { speaker: "Daniel", voice: "daniel", text: "Mum's not here. Fine. Tell her." },
      { speaker: "Emily", voice: "emily", text: "I'm recording that you were mean. Recording that you were mean. Dan-Dan? Dan-Dan?" },
    ],
  },
  {
    id: "fake",
    title: "A tape labelled FOR DANIEL",
    medium: "tape",
    lines: [
      { speaker: "Emily", voice: "fake", text: "Daniel, it's all right now." },
      { speaker: "Emily", voice: "fake", text: "I forgive you, Dan-Dan." },
      { speaker: "Emily", voice: "fake", text: "It was nobody's fault. You were only a child." },
      { speaker: "Emily", voice: "fake", text: "Do you remember the bestest birthday, Dan-Dan?" },
      { speaker: "Emily", voice: "fake", text: "Stay here with me, and don't remember the rest." },
    ],
  },
  // ---- Memories that surface as Daniel handles his family's things. Short, warm, and not about the night. ----
  { id: "mem-sibling-photo", title: "A memory", medium: "inner", lines: [
    { speaker: "Emily", voice: "emily", text: "Dan-Dan, wait for me!" },
    { speaker: "Daniel", voice: "inner", text: "She never walked anywhere with me. She ran, to keep up." },
  ] },
  { id: "mem-teddy", title: "A memory", medium: "inner", lines: [
    { speaker: "Daniel", voice: "inner", text: "I sewed that ear on at the kitchen table. She watched every stitch, and told me I was doing it wrong." },
  ] },
  { id: "mem-drawing", title: "A memory", medium: "inner", lines: [
    { speaker: "Emily", voice: "emily", text: "That's you, and that's me, and that's Mummy and Daddy. We're all holding hands." },
    { speaker: "Daniel", voice: "inner", text: "We were always holding hands, in her drawings." },
  ] },
  { id: "mem-santa", title: "A memory", medium: "inner", lines: [
    { speaker: "Emily", voice: "emily", text: "And one for Dan-Dan too. I'll write it small, so Santa doesn't run out of room." },
  ] },
  { id: "mem-school", title: "A memory", medium: "inner", lines: [
    { speaker: "Daniel", voice: "inner", text: "Front row, grinning. I was happy then. We all were." },
  ] },
  { id: "mem-chart", title: "A memory", medium: "inner", lines: [
    { speaker: "Emily", voice: "emily", text: "I read the most! Mrs Hale said so. I read the most in the whole class." },
  ] },
  { id: "mem-calendar", title: "A memory", medium: "inner", lines: [
    { speaker: "Daniel", voice: "inner", text: "Daniel in charge. Mum wrote it with two exclamation marks. She thought it was funny." },
  ] },
  { id: "mem-estate", title: "A thought", medium: "inner", lines: [
    { speaker: "Daniel", voice: "inner", text: "Mum and Dad stopped speaking about it. Then they stopped speaking. Then the house just stood here, waiting to be sold." },
  ] },
  { id: "room-foyer", title: "A thought", medium: "inner", lines: [
    { speaker: "Daniel", voice: "inner", text: "Dad's coat is still on the hook. Eleven years, and nobody moved it." },
  ] },
  { id: "room-living", title: "A thought", medium: "inner", lines: [
    { speaker: "Daniel", voice: "inner", text: "Sunday afternoons in here. Dad with the paper, Mum with her feet up, Em lying on the rug drawing on the back of the post." },
  ] },
  { id: "room-kitchen", title: "A thought", medium: "inner", lines: [
    { speaker: "Daniel", voice: "inner", text: "Mum always left a note by the kettle. For years I thought that was what a family sounded like. Notes, and the kettle." },
  ] },
  { id: "room-emily", title: "A thought", medium: "inner", lines: [
    { speaker: "Daniel", voice: "inner", text: "They never cleared it. Of course they didn't." },
  ] },
  {
    id: "msgs12",
    title: "Answering machine: messages 1 and 2",
    medium: "machine",
    lines: [
      { speaker: "Mrs Hale", voice: "teacher", text: "Hello, it's Mrs Hale from school. Just to say the reading charts go home Friday, and Emily has read the most books in her class. Wonderful." },
      { speaker: "Nana", voice: "nana", text: "Hello, poppets, it's Nana. Ring me on Sunday, and tell Em I found the book she wanted." },
    ],
  },
  {
    id: "msg3",
    title: "Answering machine: message 3",
    medium: "machine",
    lines: [
      { speaker: "Dad", voice: "richard", text: "Daniel? It's Dad. Pick up if you're there." },
      { speaker: "Dad", voice: "richard", text: "Daniel? Okay. We're leaving at nine, we'll bring chips. Tell Em we love her. Bye." },
    ],
  },
  // ---- the voice in the house (Phase 4). She is calm, patient and kind, and most of what she says is half true. ----
  { id: "matron-hall", title: "A voice in the hall", medium: "room", lines: [
    { speaker: "The Matron", voice: "matron", text: "You have been walking such a long time, Daniel." },
    { speaker: "The Matron", voice: "matron", text: "Come away from those papers. They only make you sad." },
  ] },
  { id: "matron-living", title: "A voice in the room", medium: "room", lines: [
    { speaker: "The Matron", voice: "matron", text: "I kept everything exactly as you left it." },
    { speaker: "The Matron", voice: "matron", text: "Nobody blames you here. Nobody ever has." },
    { speaker: "The Matron", voice: "matron", text: "Sit down. Let me take that weight." },
  ] },
  { id: "matron-gift", title: "A voice in the dark", medium: "room", lines: [
    { speaker: "The Matron", voice: "matron", text: "That was not kind, taking my gift apart." },
    { speaker: "The Matron", voice: "matron", text: "I only wanted you to rest." },
  ] },
  { id: "matron-truth", title: "A voice at the door", medium: "room", lines: [
    { speaker: "The Matron", voice: "matron", text: "You were upstairs. You were asleep. You did not hear a thing." },
    { speaker: "The Matron", voice: "matron", text: "Say it was an accident, Daniel. Say it, and rest." },
  ] },
  { id: "matron-lamp", title: "A voice in the doorway", medium: "room", lines: [
    { speaker: "The Matron", voice: "matron", text: "Stand in the light as long as you like, Daniel. I am very patient." },
  ] },
  { id: "matron-caught", title: "A voice, close by", medium: "room", lines: [
    { speaker: "The Matron", voice: "matron", text: "There. You see? It is quiet, when you stop looking." },
  ] },
  { id: "matron-night", title: "A voice upstairs", medium: "room", lines: [
    { speaker: "The Matron", voice: "matron", text: "Leave the evening alone, Daniel. It is an old dark thing, and you will have to carry it for ever." },
  ] },
  { id: "matron-door", title: "A voice by the front door", medium: "room", lines: [
    { speaker: "The Matron", voice: "matron", text: "You may leave whenever you like." },
    { speaker: "The Matron", voice: "matron", text: "Say it was an accident, and the door will open." },
  ] },
  { id: "whisper-promise", title: "Something repeating", medium: "tape", lines: [
    { speaker: "...", voice: "whisper", text: "Pinky promise. Promise. Pinky promise. Promise." },
  ] },
  {
    id: "dictaphone",
    title: "Dad's dictaphone note",
    medium: "tape",
    lines: [
      { speaker: "Dad", voice: "richard", text: "Saturday. Ten past six." },
      { speaker: "Dad", voice: "richard", text: "Anna says Daniel was in the house. She says we're not to ask him." },
      { speaker: "Dad", voice: "richard", text: "I keep going to the stairs to check on Emily, like it's a normal morning." },
      { speaker: "Dad", voice: "richard", text: "Best leave it. For Daniel. Best leave it." },
    ],
  },
];

/** The wording test for the false tape: which lines would Emily never say? */
export const VOICE_TEST = {
  /** Emily's genuine recordings that must have been heard first. */
  needHeard: 2,
  lines: [
    { text: "Daniel, it's all right now.", wrong: true, why: "She only ever called him 'Dan-Dan'." },
    { text: "I forgive you, Dan-Dan.", wrong: true, why: "She says 'sorry' and 'I'm not mad'. She never says 'forgive'." },
    { text: "It was nobody's fault. You were only a child.", wrong: true, why: "That is how a grown-up talks, not an eight-year-old." },
    { text: "Do you remember the bestest birthday, Dan-Dan?", wrong: false, why: "This sounds like her." },
    { text: "Stay here with me, and don't remember the rest.", wrong: true, why: "She would never ask anyone to forget." },
  ],
};
