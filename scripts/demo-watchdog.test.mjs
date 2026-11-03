// Tests scripts/demo-watchdog.mjs against SYNTHETIC heartbeat files in a temp folder. It never touches the browser, the game or docs/.
import { spawn } from "node:child_process";
import { appendFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const scenarios = {
  healthy_then_done: [0, "exit 0", (s) => s.t > 2.5 && (s.state = "done")],
  stale_heartbeat: [2, "heartbeat stopped", (s) => s.t > 2 && (s.stop = true)],
  clock_frozen: [2, "game clock frozen", (s) => s.t > 1.5 && (s.freezeClock = true)],
  no_story_progress: [2, "no chapter/objective/evidence progress", (s) => s.t > 1 && (s.freezeStory = true)],
  page_reload: [2, "browser page reloaded", (s) => s.t > 2 && (s.bootId = 222)],
  new_run_started: [2, "a different run started", (s) => s.t > 2 && (s.newRun = true)],
  segment_stalled: [2, "stopped growing", (s) => s.t > 1.5 && (s.freezeSeg = true)],
  recorder_vanished: [2, "recorder not active", (s) => s.t > 1.5 && (s.recorderActive = false)],
  bot_inactive: [2, "bot inactive", (s) => s.t > 1.5 && (s.botActive = false)],
  upload_failed: [2, "upload(s) failed", (s) => s.t > 1.5 && (s.uploadErrors = 1)],
  observer_reports_failed: [2, "reported FAILED", (s) => s.t > 1.5 && (s.state = "failed")],
  never_started: [3, "no run started", null],
};
let bad = 0;
for (const [name, [code, text, mutate]] of Object.entries(scenarios)) {
  const dir = mkdtempSync(join(tmpdir(), "wd-"));
  const wd = spawn(process.execPath, ["scripts/demo-watchdog.mjs", "--dir", dir, "--start-timeout", "3", "--heartbeat-stale", "2", "--clock-stall", "2", "--no-progress", "3", "--recorder-grace", "2", "--growth-stall", "2", "--poll", "0.3"]);
  let out = "";
  wd.stdout.on("data", (d) => (out += d));
  const seg = join(dir, "r1-part-01-x.webm");
  const s = { t: 0, state: "running", stop: false, freezeClock: false, freezeStory: false, bootId: 111, recorderActive: true, botActive: true, uploadErrors: 0, clock: 0, story: Date.now(), freezeSeg: false, newRun: false, runId: "r1" };
  const began = Date.now();
  const timer = mutate ? setInterval(() => {
    s.t = (Date.now() - began) / 1000;
    mutate(s);
    if (s.newRun && s.runId === "r1") { s.runId = "r2"; }
    if (s.stop) return;
    if (!s.freezeClock) s.clock += 0.5;
    if (!s.freezeStory) s.story = Date.now();
    if (!s.freezeSeg) appendFileSync(seg, "x".repeat(100));
    writeFileSync(join(dir, `${s.runId}-progress.json`), JSON.stringify({ runId: s.runId, bootId: s.bootId, wallMs: Date.now(), state: s.state, why: "synthetic", paused: false, clockSec: s.clock, chapter: 4, objective: "Find the original photograph", evidence: 3, storyWallMs: s.story, botActive: s.botActive, routeDone: false, recorderActive: s.recorderActive, segmentName: "r1-part-01-x.webm", uploadErrors: s.uploadErrors, fps: 30 }));
  }, 500) : null;
  const exit = await new Promise((res) => wd.on("exit", res));
  if (timer) clearInterval(timer);
  const ok = exit === code && (code === 0 || out.includes(text));
  if (!ok) bad++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name.padEnd(26)} exit ${exit} (expected ${code})  ${out.trim().split("\n").pop()}`);
}
process.exit(bad ? 1 : 0);
