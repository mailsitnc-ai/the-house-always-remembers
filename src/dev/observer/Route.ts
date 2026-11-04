import type { Bot, ObserverContext } from "./Bot";
import { BotAbort } from "./Bot";
import { VOICE_TEST } from "../../story/StoryData";
import { STUDY_CODE } from "../../systems/PuzzleSystem";
import type { RoomId } from "../../world/Layout";
import { ROOM_BY_ID } from "../../world/Layout";

/** "caught-denial" and "caught-recognition" run the true route up to the chase and then stand still, to test the two ways of being caught. */
export type RouteName = "true" | "recognition" | "denial" | "caught-denial" | "caught-recognition";

/** Evidence that explains what the Matron has been doing. The true ending needs two of them. */
const MOTIVE = ["house-statement", "parish-letter", "emily-room-note"];

/** The answers the final conversation is given, per route (the same choices a player makes on screen). */
const CHOICES: Record<RouteName, string[]> = {
  true: ["refuse", "own", "refuse"],
  recognition: ["refuse", "own", "accept"],
  denial: ["stay"],
  // Evasive at the start, honest after: caught as a man who still wanted to be taken somewhere safe (Denial).
  "caught-denial": ["unsure", "own", "refuse"],
  // Honest all the way: caught as a man who knows his part (Recognition).
  "caught-recognition": ["refuse", "own", "refuse"],
};

/**
 * The walkthrough. It plays the investigation in the order the objectives ask for it, using the doors, drawers, objects,
 * tape panels, keypad and journal exactly as a player does. Nothing sets a flag: every flag changes because the game's own
 * code ran. Steps that fail are recorded and the walkthrough carries on, so one stuck object cannot end a demonstration.
 */
export async function runRoute(bot: Bot, route: RouteName, c: ObserverContext): Promise<void> {
  const full = route !== "denial";
  const wantMotive = route === "true" || route.startsWith("caught");
  const ev = (id: string) => c.story.evidence.has(id);

  const step = async (label: string, fn: () => Promise<unknown>): Promise<void> => {
    try {
      await fn();
    } catch (e) {
      if (e instanceof BotAbort) throw e;
      bot.stats.failedUses.push(`${label}: ${String(e)}`);
    }
  };
  const room = (id: RoomId) => bot.walkTo(c.horror.nav.center(id), ROOM_BY_ID[id].level, id, 0.5);
  const read = async (id: string, secs = 3): Promise<void> => {
    if (ev(id)) return;
    await step(`read ${id}`, () => bot.examine(id, secs));
  };

  const ch = () => c.story.chapterNumber;

  // ---- Stage A: the opening plays through in full -----------------------------------------------------
  await bot.until(() => !c.story.inPrologue && c.story.chapterNumber >= 2, 900, "opening");
  if (!c.flashlight.on) bot.tap("KeyF", "f");
  // A run resumed from a late checkpoint starts moving at once (the hunt has already begun).
  if (ch() < 3) {
    await bot.sleep(2);
    await bot.lookAround(4);
  }

  // Focused test only (`&test=chase`, never part of a demonstration): begin at the chase itself, from the Chapter 8 checkpoint, instead of playing the confrontation first.
  if (new URLSearchParams(location.search).get("test") === "chase") {
    bot.annotate("Starts at the chase, from the Chapter 8 checkpoint: the confrontation's answers are set to those that lead here.");
    // The answers he gave in the conversation, as the route's choices (the same flags the finale sets when a player chooses them).
    const given = CHOICES[route];
    const rounds = ["offer", "comfort", "plan"];
    given.forEach((id, i) => c.state.set(`decision:${rounds[i]}:${id}`));
    for (const k of ["seen:mirror", "seen:body", "finale:chamber", "finale:unmasked", "seen:true-form", "finale:chase"]) c.state.set(k);
    c.horror.matron.skipTransformation();
    c.horror.hunt = false;
    c.horror.pursuitAt = -1;
    (c.finale as unknown as { keepHorrorOff: boolean; beginChase(from: string): void }).keepHorrorOff = true;
    (c.finale as unknown as { beginChase(from: string): void }).beginChase("emily");
    if (route.startsWith("caught")) await bot.until(() => c.state.get("ending:done"), 240, "caught ending");
    else await finalChase(bot, c, step);
    await bot.until(() => c.state.get("ending:done"), 90, "credits");
    return;
  }
  if (ch() < 3) {
  // ---- Stage B and C: the living room and the family photograph ---------------------------------------
  await step("living room", () => room("living"));
  await bot.lookAround(4);
  await read("living-photo", 5);
  // The first small disturbance comes after the photograph. Daniel stays and listens.
  await bot.until(() => c.state.get("scripted:steps"), 30);
  await bot.lookAround(3);
  if (full) {
    await step("living drawer", () => bot.use("drawer:living-drawer"));
    await read("index-card", 3);
    await step("living tape", () => bot.playTape("living", "christmas"));
  } else {
    await step("living drawer", () => bot.use("drawer:living-drawer"));
    await read("index-card", 3);
  }

  // ---- the kitchen and what the family left ----------------------------------------------------------
  await step("kitchen", () => room("kitchen"));
  await bot.lookAround(3);
  if (full) {
    await read("calendar");
    await read("shopping-list");
  }
  await read("kitchen-note", 4);
  await step("kitchen drawer", () => bot.use("drawer:kitchen-drawer"));
  await step("brass key", () => bot.use("pickup:brass-key", { note: "Daniel takes the key." }));

  }

  if (ch() < 4) {
  // ---- Chapter 3: upstairs, the first sighting, Emily's recorder ---------------------------------------
  await bot.until(() => c.story.chapterNumber >= 3, 20, "chapter 3");
  await bot.openJournal("objective", 3);
  await bot.closeOverlay();
  await step("landing", () => room("uphall"));
  await bot.lookAround(2);
  await step("Emily's room", () => room("emily"));
  await bot.lookAround(5);
  await step("recorder", () => bot.playTape("emily", "em3"));
  if (full) {
    for (const id of ["siblings-photo", "teddy", "drawing-house", "drawing-horse", "drawing-rainbow", "santa-letter"]) await read(id, 2.4);
    await step("dresser drawer", () => bot.use("drawer:emily-drawer-0"));
    await read("reading-chart", 2.4);
    // The note about the room is one of the clues to what the Matron is doing, so only the true route reads it.
    if (wantMotive) await read("emily-room-note", 3);
    await step("Daniel's room", () => room("daniel"));
    await read("daniel-homework", 2.4);
    await step("school photograph", () => bot.examine("school-photo", 2.4));
  }

  }

  if (ch() < 5) {
  // ---- Chapter 4: the study and the original print ----------------------------------------------------
  await step("downstairs", () => room("foyer"));
  await step("keypad", async () => {
    if (await bot.use("keypad:study-door", { note: "Daniel tries the study keypad." })) await bot.typeCode(STUDY_CODE);
  });
  await step("study", () => room("study"));
  await bot.lookAround(3);
  await step("album", async () => {
    await bot.clearVeil(14);
    await bot.examine("album-print", 5);
  });
  await step("study desk", () => bot.use("drawer:desk-drawer"));
  await read("phone-bill", 3);
  await step("birthday tape", () => bot.playTape("study", "birthday"));

  }

  if (ch() < 6) {
  // ---- Chapter 5: the false tape and the comparison ---------------------------------------------------
  await bot.until(() => c.story.chapterNumber >= 5, 20, "chapter 5");
  await step("false tape", () => bot.playTape("study", "fake"));
  await step("dictaphone", () => bot.playTape("study", "dictaphone"));
  await bot.openJournal("recordings", 3);
  await step("voice comparison", async () => {
    VOICE_TEST.lines.forEach((l, i) => {
      if (l.wrong) document.querySelector<HTMLElement>(`#journal [data-voice="${i}"]`)?.click();
    });
    await bot.sleep(1.5);
    document.querySelector<HTMLElement>('#journal [data-act="voice-check"]')?.click();
    await bot.sleep(2.5);
  });
  await bot.closeOverlay();
  // After the comparison the house goes dark and she walks the route to him. Daniel goes to the light.
  if (await bot.until(() => c.horror.active?.id === "matron-pursuit", 25)) {
    bot.annotate("The lights go out. Daniel heads for the one lit room.");
    while (c.horror.active?.id === "matron-pursuit") {
      const t = bot.litRoomTarget();
      if (t) await step("to the light", () => bot.walkTo({ x: t.x, z: t.z }, t.level, "lit room", 0.6));
      await bot.sleep(1);
    }
  }
  await bot.sleep(5);

  }

  if (ch() < 7) {
  // ---- Chapter 6: the storage room and what the family packed away -----------------------------------
  await step("storage room", () => room("storage"));
  await bot.lookAround(2);
  await step("batteries", () => bot.use("pickup:batteries", { note: "Daniel takes the batteries from the old torch." }));
  await step("suitcase", async () => {
    await bot.clearVeil(14);
    await bot.use("suitcase");
    await bot.sleep(1.5);
  });
  await read("anna-letter", 5);
  if (full) {
    await read("funeral-card", 3.5);
    await read("anna-unsent", 4);
  }
  if (wantMotive) {
    for (const id of MOTIVE.filter((m) => m !== "emily-room-note")) await read(id, 3.5);
  }

  }

  if (ch() < 8) {
  // ---- Chapter 7: the answering machine and the missing night -----------------------------------------
  await step("answering machine", async () => {
    await bot.use("deck:machine", { note: "Daniel fits the batteries." });
    await bot.sleep(1.5);
    await bot.playTape("machine", "msgs12");
    await bot.playTape("machine", "msg3");
  });
  await bot.openJournal("timeline", 3);
  await step("put the evening in order", async () => {
    document.querySelector<HTMLElement>('#journal [data-act="reconstruct"]')?.click();
    await bot.sleep(1.2);
    for (const e of c.story.evidence.nightOrder()) {
      document.querySelector<HTMLElement>(`#journal [data-order="${e.id}"]`)?.click();
      await bot.sleep(0.8);
    }
    document.querySelector<HTMLElement>('#journal [data-act="order-check"]')?.click();
    await bot.sleep(2.5);
  });
  await bot.openJournal("deductions", 4);
  await bot.closeOverlay();

  }

  // ---- Chapter 8: the mirror, the hunt, Emily's room, the end ----------------------------------------
  await bot.until(() => c.story.chapterNumber >= 8, 20, "chapter 8");
  for (let i = 0; i < 4 && !c.finale.busy && !c.state.get("seen:mirror"); i++) {
    await step("bathroom", () => room("bathroom"));
    await bot.until(() => c.finale.busy || c.state.get("seen:mirror"), 10);
  }
  await bot.until(() => !c.finale.busy, 120, "mirror scene end");
  bot.annotate("The hunt begins. Daniel heads for Emily's room, keeping to the light.");
  const startHunt = bot.clock;
  while (!c.state.get("seen:body") && !c.finale.busy && bot.clock - startHunt < 300) {
    const near = ROOM_BY_ID.emily;
    await step("to Emily's room", () => bot.walkTo({ x: (near.x0 + near.x1) / 2, z: (near.z0 + near.z1) / 2 }, 1, "emily", 0.7));
    await bot.sleep(0.5);
  }
  await bot.finaleChoices(CHOICES[route]);
  if (c.state.get("finale:chase")) {
    const caught = route.startsWith("caught");
    // The failure routes let the second grab run out the ten seconds; every route breaks free of the first.
    bot.failOnGrab = caught ? 2 : 0;
    await evade(bot, c, 1);
    if (caught) {
      // He breaks free and runs again, then is held a second time and does not fight.
      await evade(bot, c, 2);
      await bot.until(() => c.state.get("ending:done"), 240, "caught ending");
    } else {
      await finalChase(bot, c, step);
    }
  }
  // The credits are on screen. The demonstration ends here.
  await bot.until(() => c.state.get("ending:done"), 90, "credits");
}

/**
 * Daniel runs for his life through the dark half of the house, away from wherever the Matron is, until she has caught him `n` times in all. This is what a player
 * who cannot find the light does: every few seconds he heads for the dark point farthest from her. If a minute of it has not got her hands on him he stops to
 * catch his breath (and she arrives). Nothing is faked: the grab is the game's own, and the escape is the bot pressing the arrows on screen.
 */
async function evade(bot: Bot, c: ObserverContext, n: number): Promise<void> {
  const ending = () => c.state.get("ending:done") || c.state.get("ending:denial") || c.state.get("ending:recognition");
  const points: { x: number; z: number }[] = (["hall", "rear", "dining", "kitchen"] as RoomId[]).map((r) => c.horror.nav.center(r));
  bot.annotate(`RUN. Daniel sprints through the dark rooms, away from her${n > 1 ? ", again" : ""}.`);
  bot.running = true;
  const t0 = bot.clock;
  while (c.finale.grabCount < n && !ending()) {
    if (bot.clock - t0 > 60) {
      bot.annotate("Daniel stops to catch his breath. She does not.");
      bot.releaseAll();
      await bot.until(() => c.finale.grabCount >= n || !!ending(), 30, "grabbed");
      break;
    }
    const m = c.horror.matron.root.position;
    const me = c.player.position;
    const best = points
      .filter((p) => Math.hypot(p.x - me.x, p.z - me.z) > 4)
      .sort((a, b) => Math.hypot(b.x - m.x, b.z - m.z) - Math.hypot(a.x - m.x, a.z - m.z))[0];
    if (!best) {
      await bot.sleep(0.5);
      continue;
    }
    await bot.walkTo(best, 0, "away from her", 0.9);
  }
  if (c.finale.grabCount >= n && !ending()) {
    // Held: the bot's struggle reflex runs in `frame()`. Wait for the result: free, or the ending.
    await bot.until(() => !c.finale.grabbed || !!ending(), 14, "struggle");
    await bot.sleep(0.3);
  }
}

/**
 * The final chase and the front door, played the way a player would: run for the lit rooms, try the door, compare the two photographs (the one on the living-room wall
 * and the original print in the study album), put the true one in the frame, and open the door.
 */
async function finalChase(bot: Bot, c: ObserverContext, step: (label: string, fn: () => Promise<unknown>) => Promise<void>): Promise<void> {
  const ending = () => c.state.get("ending:done") || c.state.get("ending:denial") || c.state.get("ending:recognition");
  bot.annotate("RUN. The Matron is behind him; he heads for the lit rooms.");
  bot.running = true;
  const foyer = c.horror.nav.center("foyer");
  await step("run to the foyer", () => bot.walkTo(foyer, 0, "foyer", 0.6));
  if (ending()) return;
  bot.refugeOnly = true;
  // Each step is retried until the game's own flag says it worked: a lamp failing in the middle of a walk (which sends Daniel to another lit room) must not end the run.
  const until = async (label: string, flag: string, steps: () => Promise<unknown>): Promise<void> => {
    for (let attempt = 0; attempt < 8 && !c.state.get(flag) && !ending(); attempt++) {
      await step(`${label} (try ${attempt + 1})`, steps);
      await bot.sleep(1);
    }
  };
  const LIVING = { x: 3.4, z: 1.4 };
  const FOYER = { x: 6.5, z: 1.4 };
  await until("try the front door", "finale:door-tried", async () => {
    await bot.walkTo(FOYER, 0, "foyer", 0.6);
    await bot.use("door:front", { note: "Daniel tries the front door: \"Something is on the other side.\"" });
  });
  await bot.sleep(8);
  // Through the lit rooms only: the living room is entered straight from the foyer, never by the dark hall.
  await until("look at the photograph", "finale:photo-seen", async () => {
    await bot.walkTo(LIVING, 0, "living room", 0.6);
    await bot.use("read:living-photo", { note: "Daniel looks at the family photograph: the fifth figure stands at the door." });
  });
  await bot.sleep(3);
  await until("take the original print", "finale:print", async () => {
    await bot.walkTo(FOYER, 0, "foyer", 0.6);
    await bot.walkTo({ x: 10.5, z: 1.8 }, 0, "study", 0.6);
    await bot.use("read:album-print", { note: "Daniel takes the original print out of the album: four people, an empty step." });
  });
  await bot.sleep(3);
  await until("replace the photograph", "finale:anchor", async () => {
    await bot.walkTo(FOYER, 0, "foyer", 0.6);
    await bot.walkTo(LIVING, 0, "living room", 0.6);
    await bot.use("read:living-photo", { note: "Daniel puts the original print where the false one hangs." });
  });
  await bot.until(() => c.state.get("finale:anchor") || ending(), 20, "anchor broken");
  bot.annotate("The connection breaks. Her cry; the lamps fail together; then silence.");
  await bot.until(() => !!c.horror.matron && c.state.get("finale:anchor"), 5);
  await bot.sleep(6);
  bot.running = false;
  bot.refugeOnly = false;
  for (let attempt = 0; attempt < 5 && !c.state.get("ending:true"); attempt++) {
    await step("walk to the front door", () => bot.walkTo(foyer, 0, "foyer", 0.6));
    await step("open the front door", () => bot.use("door:front", { note: "Daniel opens the front door." }));
    await bot.sleep(2);
  }
}
