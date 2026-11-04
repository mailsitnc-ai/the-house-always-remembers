import type { RecordingDef } from "./StoryData";

/**
 * Phase 6 dialogue: the mirror, the hunt, the reveal, the confrontation and the three endings.
 *
 * These lines have **no audio clips yet**. They run as subtitles with estimated timing, and they will pick up real
 * recordings automatically: a clip named `<recording id>-<line index>.m4a` listed in `public/audio/dialogue/manifest.json`
 * is played instead (see DialogueSystem). Voice keys follow VOICE_DIRECTION.md: the Matron is slow, level and precise,
 * "fake" is the Matron imitating Emily badly, "inner" is Daniel's thought.
 *
 * Canon guard: nothing here says how or where Emily's accident happened.
 */
export const FINALE_RECORDINGS: RecordingDef[] = [
  // ---- the mirror ----
  { id: "fin-mirror-1", title: "The mirror", medium: "inner", lines: [
    { speaker: "Daniel", voice: "inner", text: "Eleven years of this face. I'd stopped looking at it." },
  ] },
  { id: "fin-mirror-2", title: "The mirror", medium: "inner", lines: [
    { speaker: "Daniel", voice: "inner", text: "That's me. That is me. But I didn't..." },
  ] },
  { id: "fin-mirror-3", title: "A voice behind the glass", medium: "room", lines: [
    { speaker: "The Matron", voice: "matron", text: "Look at him, Daniel. That is what you have made of yourself." },
    { speaker: "The Matron", voice: "matron", text: "I can make him quiet. You only have to stop looking." },
  ] },
  { id: "fin-mirror-4", title: "The mirror", medium: "inner", lines: [
    { speaker: "Daniel", voice: "inner", text: "She wants me to look away. Everything in this house wants me to look away." },
  ] },
  // ---- the hunt ----
  { id: "fin-hunt-1", title: "A voice in the dark", medium: "room", lines: [
    { speaker: "The Matron", voice: "matron", text: "I kept this place safe for you." },
    { speaker: "The Matron", voice: "matron", text: "Come upstairs. Your sister is waiting." },
  ] },
  { id: "fin-hunt-2", title: "A voice in the dark", medium: "room", lines: [
    { speaker: "The Matron", voice: "matron", text: "You always were such a difficult child, Daniel." },
  ] },
  // ---- the reveal ----
  { id: "fin-reveal-1", title: "Daniel, in the room", medium: "inner", lines: [
    { speaker: "Daniel", voice: "inner", text: "Em." },
    { speaker: "Daniel", voice: "inner", text: "She kept you. All this time, she kept you." },
  ] },
  { id: "fin-reveal-2", title: "Daniel, in the room", medium: "inner", lines: [
    { speaker: "Daniel", voice: "inner", text: "The lavender. The cold. The lights that never went out." },
    { speaker: "Daniel", voice: "inner", text: "She wasn't looking after us. She was looking after this." },
  ] },
  { id: "fin-reveal-3", title: "The Matron", medium: "room", lines: [
    { speaker: "The Matron", voice: "matron", text: "Your sister was very fond of you. Don't disappoint her again." },
    { speaker: "The Matron", voice: "matron", text: "Eleven years, and not a mark of time on her. I would never let anything happen to her." },
  ] },
  // ---- the confrontation ----
  { id: "fin-offer", title: "The Matron", medium: "room", lines: [
    { speaker: "The Matron", voice: "matron", text: "You came back because you knew I was waiting." },
    { speaker: "The Matron", voice: "matron", text: "You don't need to remember everything. Stay. Nothing happened here, and Emily is upstairs, just as you left her." },
  ] },
  { id: "fin-comfort", title: "A voice that is nearly Emily's", medium: "room", lines: [
    { speaker: "Emily", voice: "fake", text: "Dan-Dan? Do not be cross. I forgive you completely. Do stay." },
    { speaker: "The Matron", voice: "matron", text: "She is only asking for what you owe her. Is it so much?" },
  ] },
  { id: "fin-plan", title: "The Matron", medium: "room", lines: [
    { speaker: "The Matron", voice: "matron", text: "Good. Then you know what you carry, and what it is worth to someone who can use it." },
    { speaker: "The Matron", voice: "matron", text: "Let me look after it for you. You will never have to be alone with it again." },
  ] },
  // Only played if Daniel has already worked the plan out from the evidence. She confirms it; she does not first explain it.
  { id: "fin-plan-known", title: "The Matron", medium: "room", lines: [
    { speaker: "The Matron", voice: "matron", text: "You have been clever. Yes. Your guilt, your love for her, every memory you could not put down: they are a road, and I have waited eleven years for you to walk it." },
    { speaker: "The Matron", voice: "matron", text: "Take her hand, Daniel. It will not hurt her. And it will not be Emily who gets up. I never wanted her back. I want what she left behind." },
  ] },
  // ---- the unmasking: Daniel refuses, and she stops pretending ----
  { id: "fin-unmask", title: "The Matron", medium: "room", lines: [
    { speaker: "The Matron", voice: "matron", text: "Then I will stop asking, Daniel." },
    { speaker: "The Matron", voice: "matron", text: "I have held that door for eleven years. Run, if you like." },
  ] },
  // ---- ending 1: denial (the Matron takes him, as he asks) ----
  { id: "end1-offer", title: "The Matron", medium: "room", lines: [
    { speaker: "The Matron", voice: "matron", text: "Good. Emily is upstairs, just as you left her. Your mother is waiting, and your father." },
    { speaker: "Daniel", voice: "daniel", text: "Please... take me with my family." },
  ] },
  { id: "end1-catch", title: "The Matron", medium: "room", lines: [
    { speaker: "The Matron", voice: "matron", text: "There. You are tired, and there is no one left to be brave for." },
    { speaker: "The Matron", voice: "matron", text: "Your mother is waiting for you. Your father. Emily. I can take you to them." },
    { speaker: "Daniel", voice: "daniel", text: "Please... take me with my family." },
  ] },
  { id: "end1-ritual", title: "The Matron", medium: "room", lines: [
    { speaker: "The Matron", voice: "matron", text: "Rest now. It will not hurt for long." },
    { speaker: "The Matron", voice: "matron", text: "A road can be walked only once, Daniel. You carried it a very long way." },
    { speaker: "The Matron", voice: "matron", text: "Eleven years I have kept this small body for me. Now." },
  ] },
  { id: "end1-wake", title: "The Matron", medium: "room", lines: [
    { speaker: "The Matron", voice: "matron", text: "There. Thank you, Daniel." },
    { speaker: "The Matron", voice: "matron", text: "It was never going to be Emily who got up." },
    { speaker: "The Matron", voice: "matron", text: "The door, now. It will open for me." },
  ] },
  // ---- ending 2: recognition ----
  { id: "end2-dawn", title: "Dawn", medium: "inner", lines: [
    { speaker: "Daniel", voice: "inner", text: "I did it. I was thirteen, and I was frightened, and I waited. That is what I did." },
    { speaker: "Daniel", voice: "inner", text: "I don't understand everything that happened in that house. But I know this part is mine." },
  ] },
  // ---- ending 3: the true ending ----
  { id: "end3-door", title: "The front door", medium: "inner", lines: [
    { speaker: "Daniel", voice: "inner", text: "It was never on the other side." },
    { speaker: "Daniel", voice: "inner", text: "She wrote herself into the picture, and I let her. All I had to do was take her out." },
  ] },
  { id: "end3-dawn", title: "Dawn", medium: "inner", lines: [
    { speaker: "Daniel", voice: "inner", text: "It was my choice, and my delay, and my fault. It wasn't the whole of me." },
    { speaker: "Daniel", voice: "inner", text: "I can carry that. I don't have to carry it as a punishment." },
  ] },
];
