import type { Bot, ObserverContext } from "./Bot";
import { BotAbort } from "./Bot";
import { VOICE_TEST } from "../../story/StoryData";
import { STUDY_CODE } from "../../systems/PuzzleSystem";
import type { RoomId } from "../../world/Layout";
import { ROOM_BY_ID } from "../../world/Layout";

export type RouteName = "true" | "recognition" | "denial";

/** Evidence that explains what the Matron has been doing. The true ending needs two of them. */
const MOTIVE = ["house-statement", "parish-letter", "emily-room-note"];

/** The answers the final conversation is given, per route (the same choices a player makes on screen). */
const CHOICES: Record<RouteName, string[]> = {
  true: ["refuse", "own", "refuse"],
  recognition: ["refuse", "own", "accept"],
  denial: ["stay"],
};

/**
 * The walkthrough. It plays the investigation in the order the objectives ask for it, using the doors, drawers, objects,
 * tape panels, keypad and journal exactly as a player does. Nothing sets a flag: every flag changes because the game's own
 * code ran. Steps that fail are recorded and the walkthrough carries on, so one stuck object cannot end a demonstration.
 */
export async function runRoute(bot: Bot, route: RouteName, c: ObserverContext): Promise<void> {
  const full = route !== "denial";
  const wantMotive = route === "true";
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
  await bot.sleep(2);
  await bot.lookAround(4);

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
  // The credits are on screen. The demonstration ends here.
  await bot.until(() => c.state.get("ending:done"), 30);
}
