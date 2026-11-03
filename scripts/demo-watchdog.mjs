// Passive wall-clock watchdog for the automated walkthrough recording (developer tool).
// It only READS files the recorder writes into docs/full-story-demo/video/ (the run's <run>-progress.json heartbeat and its segment files).
// It never touches the browser, the game, the bot or the dev server. On the first failure it prints the exact reason and exits with code 2;
// on a finished run it exits 0; if no run starts in time it exits 3.
//
//   node scripts/demo-watchdog.mjs [--dir docs/full-story-demo/video] [--start-timeout 900] [--heartbeat-stale 30] [--clock-stall 60]
//        [--no-progress 900] [--recorder-grace 30] [--growth-stall 60] [--poll 2]       (all times in wall-clock seconds)
import { existsSync, readdirSync, readFileSync, statSync, appendFileSync } from "node:fs";
import { join } from "node:path";

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const dir = arg("dir", "docs/full-story-demo/video");
const T = {
  start: +arg("start-timeout", 900) * 1000,
  beat: +arg("heartbeat-stale", 30) * 1000,
  clock: +arg("clock-stall", 60) * 1000,
  story: +arg("no-progress", 900) * 1000,
  recorder: +arg("recorder-grace", 30) * 1000,
  growth: +arg("growth-stall", 60) * 1000,
  poll: +arg("poll", 2) * 1000,
};
const t0 = Date.now();
let logFile = null;
const say = (m) => {
  const line = `${new Date().toISOString().slice(11, 19)}  ${m}`;
  console.log(line);
  if (logFile) appendFileSync(logFile, line + "\n");
};
const fail = (code, why) => {
  say(`WATCHDOG FAILURE: ${why}`);
  process.exit(code);
};
const read = (f) => {
  try {
    return JSON.parse(readFileSync(f, "utf8"));
  } catch {
    return null;
  }
};
const newestProgress = () => {
  if (!existsSync(dir)) return null;
  const c = readdirSync(dir).filter((f) => f.endsWith("-progress.json")).map((f) => ({ f: join(dir, f), m: statSync(join(dir, f)).mtimeMs })).filter((x) => x.m >= t0 - 2000);
  c.sort((a, b) => b.m - a.m);
  return c[0] ?? null;
};

say(`watching ${dir}; waiting for a run to start (up to ${T.start / 1000}s)`);
let file = null;
let first = null;
let last = null;
let clockAt = Date.now(), clockVal = -1;
let storyAt = Date.now(), storyVal = -1;
let recMissingSince = 0, botMissingSince = 0;
let segSize = -1, segAt = Date.now(), segName = "";
let lastChapter = -1;

setInterval(() => {
  const now = Date.now();
  if (!file) {
    const p = newestProgress();
    if (!p) {
      if (now - t0 > T.start) fail(3, `no run started within ${T.start / 1000}s (no new *-progress.json)`);
      return;
    }
    file = p.f;
    logFile = file.replace(/-progress\.json$/, "-watchdog.txt");
    say(`run detected: ${file}`);
  }
  // A newer run's heartbeat replacing this one means the page rebooted and started over.
  const newer = newestProgress();
  if (newer && newer.f !== file) fail(2, `a different run started (${newer.f}); the page was reloaded and restarted`);
  const m = existsSync(file) ? statSync(file).mtimeMs : 0;
  const p = read(file);
  if (!p) return;
  if (!first) {
    first = p;
    clockAt = storyAt = segAt = now;
  }
  last = p;
  if (p.state === "done") {
    say(`run reported DONE (chapter ${p.chapter}, game clock ${p.clockSec}s)`);
    process.exit(0);
  }
  if (p.state === "failed") fail(2, `the Observer itself reported FAILED: ${p.why} (chapter ${p.chapter}; objective: ${p.objective})`);
  if (p.bootId !== first.bootId) fail(2, `browser page reloaded / fresh boot (bootId ${first.bootId} -> ${p.bootId})`);
  if (now - m > T.beat) fail(2, `heartbeat stopped ${Math.round((now - m) / 1000)}s ago (page closed, reloaded, crashed, frozen or the dev server is down); last: chapter ${p.chapter}, game clock ${p.clockSec}s, objective: ${p.objective}`);
  if (p.uploadErrors > 0) fail(2, `${p.uploadErrors} video/log upload(s) failed; footage is incomplete (segment ${p.segmentName})`);
  if (p.chapter !== lastChapter) {
    lastChapter = p.chapter;
    say(`chapter ${p.chapter}; objective: ${p.objective}; game clock ${p.clockSec}s; evidence ${p.evidence}; fps ${p.fps}`);
  }
  // Game clock must advance while the run is not paused.
  if (p.paused || p.clockSec !== clockVal) {
    clockVal = p.clockSec;
    clockAt = now;
  } else if (now - clockAt > T.clock) fail(2, `game clock frozen at ${p.clockSec}s for ${Math.round((now - clockAt) / 1000)}s while not paused`);
  // Chapter / objective / evidence / puzzle / story-flag progress, in wall-clock time.
  if (p.storyWallMs !== storyVal) {
    storyVal = p.storyWallMs;
    storyAt = now;
  }
  const sinceStory = now - Math.max(storyAt, p.storyWallMs);
  if (!p.paused && !p.routeDone && sinceStory > T.story) fail(2, `no chapter/objective/evidence progress for ${Math.round(sinceStory / 1000)}s of wall time; chapter ${p.chapter}; objective: ${p.objective}`);
  // Recorder and bot must stay present (short grace for the gap between segments).
  if (!p.recorderActive) {
    recMissingSince ||= now;
    if (now - recMissingSince > T.recorder) fail(2, `recorder not active for ${Math.round((now - recMissingSince) / 1000)}s`);
  } else recMissingSince = 0;
  if (!p.botActive && !p.routeDone) {
    botMissingSince ||= now;
    if (now - botMissingSince > T.recorder) fail(2, `Observer bot inactive for ${Math.round((now - botMissingSince) / 1000)}s before the route finished`);
  } else botMissingSince = 0;
  // The current segment file must keep growing while recording.
  const sf = join(dir, p.segmentName || "");
  if (p.segmentName && existsSync(sf)) {
    const size = statSync(sf).size;
    if (p.segmentName !== segName || size !== segSize) {
      segName = p.segmentName;
      segSize = size;
      segAt = now;
    } else if (p.recorderActive && now - segAt > T.growth) fail(2, `segment ${p.segmentName} stopped growing at ${size} bytes ${Math.round((now - segAt) / 1000)}s ago`);
  } else if (p.recorderActive && p.segmentName && now - segAt > T.growth) fail(2, `segment file ${p.segmentName} does not exist on disk`);
}, T.poll);
