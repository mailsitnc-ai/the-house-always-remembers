// Generates the game's dialogue clips from the lines in src/story/StoryData.ts, using the voices in
// src/story/DialogueVoices.ts. It runs on the developer's Mac with the built-in `say` and `afconvert` tools: no network,
// no accounts, no cost. Output: public/audio/dialogue/<recording>-<line>.m4a plus manifest.json.
//
//   node tools/generate-dialogue.mjs            (only regenerates lines that changed)
//   node tools/generate-dialogue.mjs --force    (regenerates everything)
//
// To use real recordings instead: put files with the same names in that folder and set their "duration" in manifest.json.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { RECORDINGS } from "../src/story/StoryData.ts";
import { VOICES } from "../src/story/DialogueVoices.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public/audio/dialogue");
const manifestPath = join(outDir, "manifest.json");
const force = process.argv.includes("--force");
mkdirSync(outDir, { recursive: true });
const old = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : { clips: {} };

/** Text as the voice should say it: names and slang spelled so they are pronounced correctly. */
function speakable(text) {
  return text
    .replace(/Dan-Dan/g, "Dan Dan")
    .replace(/'Cause/g, "Because")
    .replace(/\b([A-Z]{3,})\b/g, (m) => m.toLowerCase())
    .replace(/\s+—\s+/g, ", ")
    .replace(/\.\.\./g, ", ");
}

function durationOf(file) {
  const out = execFileSync("afinfo", [file], { encoding: "utf8" });
  const m = out.match(/estimated duration:\s*([\d.]+)/);
  return m ? Number(m[1]) : 0;
}

const clips = {};
let made = 0;
let kept = 0;
let bytes = 0;
for (const rec of RECORDINGS) {
  rec.lines.forEach((line, i) => {
    const key = `${rec.id}#${i}`;
    const v = VOICES[line.voice];
    if (!v) throw new Error(`No voice profile for ${line.voice} (${key})`);
    const text = speakable(line.text);
    const hash = createHash("sha1").update(`${v.say}|${v.rate}|${text}`).digest("hex").slice(0, 12);
    const file = `${rec.id}-${i}.m4a`;
    const path = join(outDir, file);
    const prev = old.clips?.[key];
    if (!force && prev && prev.hash === hash && existsSync(path)) {
      clips[key] = prev;
      kept++;
      bytes += statSync(path).size;
      return;
    }
    const tmp = join(outDir, `${rec.id}-${i}.tmp.aiff`);
    execFileSync("say", ["-v", v.say, "-r", String(v.rate), "-o", tmp, text]);
    execFileSync("afconvert", ["-f", "m4af", "-d", "aac", "-b", "48000", tmp, path]);
    rmSync(tmp);
    const duration = durationOf(path);
    clips[key] = { file, duration: Number(duration.toFixed(3)), voice: line.voice, text: line.text, hash };
    made++;
    bytes += statSync(path).size;
  });
}
writeFileSync(manifestPath, JSON.stringify({ generated: new Date().toISOString(), clips }, null, 1));
console.log(`dialogue clips: ${made} generated, ${kept} unchanged, ${(bytes / 1024).toFixed(0)} KB total`);
