import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { EventBus, type GamePhase } from "./EventBus";
import { GameState } from "./GameState";
import { Input } from "./Input";
import { PerfMonitor } from "./PerfMonitor";
import { Settings, type SettingsData } from "../platform/Settings";
import { AudioManager } from "../atmosphere/AudioManager";
import { LightingManager } from "../atmosphere/LightingManager";
import { Flashlight } from "../atmosphere/Flashlight";
import { HorrorDirector } from "../horror/HorrorDirector";
import { Guide } from "../world/Guide";
import { PlayerController } from "../player/PlayerController";
import { InteractionSystem } from "../player/InteractionSystem";
import { InspectionSystem } from "../player/InspectionSystem";
import { PuzzleSystem } from "../systems/PuzzleSystem";
import { Materials } from "../world/Materials";
import { House } from "../world/House";
import { RoomRegistry } from "../world/RoomRegistry";
import { roomAt, ROOM_BY_ID, floorHeight, type RoomId } from "../world/Layout";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { InventorySystem } from "../systems/InventorySystem";
import type { WorldContext } from "../world/WorldContext";
import { Ui } from "../ui/Ui";
import { Benchmark } from "./Benchmark";
import { StoryDirector } from "../story/StoryDirector";
import { StoryUi } from "../ui/StoryUi";
import { CHAPTERS } from "../story/StoryData";
import type { BenchRow } from "./PerfMonitor";
import { SaveSystem, type SaveData } from "../platform/SaveSystem";
import { StuckGuard, stepFree } from "../player/Recovery";
import { MapUi } from "../ui/MapUi";
import { Stage } from "../world/Stage";
import { Finale } from "../story/Finale";
import { factsOf } from "../story/Endings";

/**
 * Developer-only Observer Mode (an automated demonstration). It exists only in development builds and only when the page is
 * opened with `?observer`. In a production build `import.meta.env.DEV` is false, so this is constant-folded away together with
 * everything it imports, and the normal game is untouched.
 */
const OBSERVER: boolean = import.meta.env.DEV && typeof location !== "undefined" && (new URLSearchParams(location.search).has("observer") || new URLSearchParams(location.search).has("demo"));
/** Developer-only entity showcase: dev server and `?showcase` only, constant-folded away in production. */
/** Each ending's viewing link keeps its own Observer save (`?ending=true|denial|recognition`), so one can never contaminate another or the normal game. */
function observerNamespace(): string {
  const e = new URLSearchParams(location.search).get("ending");
  return e === "true" || e === "denial" || e === "recognition" ? `thar.observer.${e}` : "thar.observer";
}
const SHOWCASE: boolean = import.meta.env.DEV && typeof location !== "undefined" && new URLSearchParams(location.search).has("showcase");

const WARM: [number, number, number] = [0.032, 0.022, 0.013];
const COLD: [number, number, number] = [0.012, 0.019, 0.03];
/** Fog colour by room: warm amber in rooms that were lived in, cold blue-grey in passages, upstairs and the damp rooms. */
const FOG_TINT: Record<RoomId, [number, number, number]> = {
  foyer: COLD, hall: COLD, rear: COLD, living: WARM, dining: WARM, kitchen: WARM, study: WARM,
  uphall: COLD, storage: COLD, daniel: [0.022, 0.02, 0.018], emily: [0.028, 0.02, 0.02], bathroom: COLD,
};

/** Wires the systems together and owns the phase state machine (menu / playing / paused / ...). */
export class Game {
  private phase: GamePhase = "loading";
  private readonly settings = new Settings();
  private readonly events = new EventBus();
  private readonly state = new GameState(this.events);
  private readonly input: Input;
  private readonly engine: Engine;
  private readonly scene: Scene;
  private readonly perf: PerfMonitor;
  private readonly audio = new AudioManager();
  private readonly lighting: LightingManager;
  private readonly player: PlayerController;
  private readonly flashlight: Flashlight;
  private horror!: HorrorDirector;
  private guide!: Guide;
  private readonly interaction: InteractionSystem;
  private readonly inspection: InspectionSystem;
  private readonly puzzles: PuzzleSystem;
  private readonly house: House;
  private readonly registry: RoomRegistry;
  private readonly inventory: InventorySystem;
  private resumeTimer = 0;
  private readonly benchmark: Benchmark;
  private benchPending = false;
  private readonly story: StoryDirector;
  private storyUi!: StoryUi;
  private controlsLocked = false;
  private dolly = false;
  private overlayReturn: GamePhase = "playing";
  private benchDoors: Record<string, boolean> = {};
  private stage!: Stage;
  private finale!: Finale;
  private save!: SaveSystem;
  private saveTimer = 0;
  private observer: { timeScale: number; update(dt: number): void } | null = null;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.input = new Input(canvas);
    this.engine = new Engine(canvas, true, { powerPreference: "high-performance", stencil: false }, true);
    this.scene = new Scene(this.engine);
    this.perf = new PerfMonitor(this.engine, this.scene, document.getElementById("hud")!);
    this.perf.mark("engine-ready");

    this.lighting = new LightingManager(this.scene);
    this.player = new PlayerController(this.scene, this.input, this.audio);
    this.flashlight = new Flashlight(this.scene, this.player.camera, this.audio);
    this.interaction = new InteractionSystem(this.scene, this.player, this.input, this.events);
    this.inspection = new InspectionSystem(this.scene, this.player, this.input, this.events);
    this.puzzles = new PuzzleSystem(this.state, this.events);
    this.inventory = new InventorySystem(this.events);
    this.story = new StoryDirector(this.events, this.state, this.audio, this.lighting);
    this.registry = new RoomRegistry(this.scene, this.flashlight);
    this.events.on("chapter:changed", () => this.audio.chapterPad());
    this.registry.onRoomChange = (room, fog) => {
      this.lighting.setFogTarget(fog, FOG_TINT[room]);
      this.events.emit("room:changed", { room: ROOM_BY_ID[room].name });
      this.story.onRoom(room);
      this.audio.setRoomAmbience(room);
    };

    const ctx: WorldContext = {
      scene: this.scene,
      events: this.events,
      state: this.state,
      audio: this.audio,
      lighting: this.lighting,
      flashlight: this.flashlight,
      interaction: this.interaction,
      inspection: this.inspection,
      puzzles: this.puzzles,
      inventory: this.inventory,
      evidence: this.story.evidence,
      story: this.story,
      mats: new Materials(this.scene),
      track: (mesh, rooms, opts) => this.registry.track(mesh, rooms, opts),
      untrack: (mesh) => this.registry.untrack(mesh),
      registerLamp: (lamp, room) => this.registry.registerLamp(lamp, room),
    };
    this.lighting.setGlowMaterial(ctx.mats.glow);
    this.perf.mark("materials-built");
    this.house = new House(ctx, this.registry);
    this.house.build();
    this.benchmark = new Benchmark(this.player);
    this.player.position.copyFrom(this.house.spawn);
    this.registry.update(roomAt(this.house.spawn.x, this.house.spawn.z, 0));
    this.perf.mark("world-built");
    this.horror = new HorrorDirector({
      scene: this.scene,
      events: this.events,
      state: this.state,
      audio: this.audio,
      lighting: this.lighting,
      flashlight: this.flashlight,
      player: this.player,
      registry: this.registry,
      house: this.house,
      story: this.story,
      interaction: this.interaction,
    });
    this.guide = new Guide(this.scene, this.events, this.interaction, this.player, this.registry);
    this.perf.mark("horror-ready");

    this.stage = new Stage(this.scene);
    // The Matron stands in the chamber for the confrontation: its lamp must be able to light her.
    this.stage.include(this.horror.matron.root);
    this.save = new SaveSystem({ capture: () => this.captureSave(), apply: (d) => this.applySave(d) }, OBSERVER ? observerNamespace() : SHOWCASE ? "thar.showcase" : undefined);
    this.finale = new Finale({
      events: this.events,
      state: this.state,
      audio: this.audio,
      lighting: this.lighting,
      flashlight: this.flashlight,
      player: this.player,
      horror: this.horror,
      story: this.story,
      stage: this.stage,
      save: this.save,
      scene: this.scene,
      house: this.house,
      interaction: this.interaction,
      inventory: this.inventory,
      input: this.input,
    });
    this.setupAutosave();

    this.applySettings(this.settings.data);
    this.audio.setMasterVolume(this.settings.data.volume);

    const ui = new Ui(
      this.events,
      {
        onBegin: () => this.begin(),
        onResume: () => this.lockPointer(),
        onSettings: (patch) => {
          this.settings.update(patch);
          this.applySettings(this.settings.data);
        },
        onKeypadSubmit: (id, code) => {
          const ok = this.puzzles.attempt(id, code);
          if (ok) this.closeKeypad();
          else this.audio.buzz();
          return ok;
        },
        onKeypadClose: () => this.closeKeypad(),
        onTestSound: () => {
          this.audio.playTest().catch(() => this.startAudio());
        },
        onVolumeCommit: () => this.audio.blip(),
        audioStatus: () => this.audioStatus(),
        onContinue: () => this.continueGame(),
        onSave: () => this.manualSave(),
        onToMenu: () => this.returnToMenu(),
        onClearSave: () => {
          this.save.clear();
          this.save.clearMeta();
        },
        onCredits: () => this.events.emit("credits:show", { ending: "menu" }),
        saveLabel: () => this.saveLabel(),
        onJournal: () => {
          this.overlayReturn = "paused";
          this.setPhase("journal");
          this.events.emit("journal:open", {});
        },
        onMap: () => {
          this.overlayReturn = "paused";
          this.events.emit("map:open", {});
        },
        onBenchmark: () => {
          this.benchPending = true;
          this.lockPointer();
        },
        codeLength: (id) => this.puzzles.codeLength(id),
      },
      this.settings.data,
    );
    this.settingsUi = ui;
    this.storyUi = new StoryUi(this.events, this.story, this.audio, () => this.closeOverlay());
    new MapUi(this.events, {
      player: () => ({ x: this.player.position.x, z: this.player.position.z, level: this.player.floorBase > 1.5 ? 1 : 0, yaw: this.player.camera.rotation.y }),
      discovered: (room) => this.state.get(`visited:${room}`) || this.registry.currentRoom === room,
      objective: () => ({ room: (this.story.objectives.current().room as RoomId | undefined) ?? null }),
      onClose: () => this.closeOverlay(),
    });
    this.events.on("phase:changed", ({ to }) => this.storyUi.showPhase(to));
    this.events.on("controls:lock", ({ locked }) => (this.controlsLocked = locked));
    this.events.on("cine:dolly", ({ on }) => (this.dolly = on));
    this.events.on("credits:done", () => {
      if (!this.state.get("ending:done")) return;
      const menu = (): void => {
        this.events.emit("postcredits:done", {});
        if (!this.observer) window.location.reload();
        else {
          // The automated walkthrough cannot reload (that would start it over): it shows the main menu instead.
          this.events.emit("byebye", { on: false });
          this.events.emit("veil", { opacity: 0, ms: 0 });
          this.setPhase("menu");
        }
      };
      // After the True Ending's credits and telephone scene: a short final scare, then the main menu. The other endings go straight back.
      if (this.finale.reached === "true") this.finale.postCredits(menu);
      else menu();
    });
    this.events.on("journal:open", () => {
      if (this.phase === "playing") {
        this.overlayReturn = "playing";
        this.setPhase("journal");
        document.exitPointerLock();
      }
    });
    this.events.on("map:open", () => {
      if (this.phase === "playing" || this.phase === "paused") {
        if (this.phase === "playing") this.overlayReturn = "playing";
        this.setPhase("map");
        document.exitPointerLock();
      }
    });
    this.events.on("recorder:open", () => {
      this.overlayReturn = "playing";
      this.setPhase("recorder");
      document.exitPointerLock();
    });
    this.perf.extraLine = () => `${this.audioStatus()}\n${this.horror.status()}`;

    this.events.on("inspect:open", () => this.setPhase("inspecting"));
    this.events.on("inspect:close", () => {
      if (this.phase === "inspecting") this.setPhase("playing");
    });
    this.events.on("keypad:open", () => {
      this.setPhase("keypad");
      document.exitPointerLock();
    });

    document.addEventListener("pointerlockchange", () => this.onPointerLockChange());
    document.addEventListener("pointerlockerror", () => {
      if (this.phase === "resuming") this.setPhase("paused");
    });
    window.addEventListener("resize", () => this.engine.resize());

    if (import.meta.env.DEV) {
      // Dev-only: lets automated checks enter gameplay in environments that refuse pointer lock.
      (window as unknown as { __debug: unknown }).__debug = {
        play: () => this.setPhase("playing"),
        /** For checking the ending sequences without replaying the story. */
        endings: { events: this.events, state: this.state, finale: this.finale, phase: () => this.phase },
        teleport: (x: number, z: number, yaw = 0, pitch = 0, level = 0) => {
          this.player.setBase(level * 3);
          this.player.position.set(x, level * 3 + 1.65, z);
          this.player.setLook(yaw, pitch);
        },
        /**
         * Synchronous collision walk (no frames needed): moves the camera along waypoints using the real collision
         * system, with doors open, and reports where it got stuck. Returns one result per waypoint.
         */
        walk: (pts: [number, number][], level = 0, openDoors = true) => {
          const cam = this.player.camera as unknown as { position: Vector3; _collideWithWorld(v: Vector3): void };
          const prevDoors = openDoors ? this.house.setAllDoors(true) : null;
          this.registry.beginWarmUp();
          this.player.setBase(level * 3);
          cam.position.set(pts[0][0], level * 3 + 1.65, pts[0][1]);
          const out: { to: [number, number]; ok: boolean; at: [number, number] }[] = [];
          for (let i = 1; i < pts.length; i++) {
            const [tx, tz] = pts[i];
            let stuck = 0;
            let ok = false;
            for (let n = 0; n < 600; n++) {
              const dx = tx - cam.position.x;
              const dz = tz - cam.position.z;
              const dist = Math.hypot(dx, dz);
              if (dist < 0.12) {
                ok = true;
                break;
              }
              const step = Math.min(0.08, dist);
              const bx = cam.position.x;
              const bz = cam.position.z;
              cam._collideWithWorld(new Vector3((dx / dist) * step, 0, (dz / dist) * step));
              const base = floorHeight(cam.position.x, cam.position.z, this.player.floorBase);
              this.player.setBase(base);
              cam.position.y = base + 1.65;
              stuck = Math.hypot(cam.position.x - bx, cam.position.z - bz) < step * 0.4 ? stuck + 1 : 0;
              if (stuck > 4) break;
            }
            out.push({ to: [tx, tz], ok, at: [+cam.position.x.toFixed(2), +cam.position.z.toFixed(2)] });
          }
          this.registry.endWarmUp();
          if (prevDoors) for (const [id, open] of Object.entries(prevDoors)) this.house.doors[id]?.setOpen(open);
          return out;
        },
        /** Developer-only tests of the confrontation branching (see dev/EndingsTest.ts). */
        endingTests: async () => (await import("../dev/EndingsTest")).runEndingTests(),
        /** Developer-only collision/softlock audit against the real collision system (see dev/CollisionAudit.ts). */
        audit: async () => {
          const { auditCollisions } = await import("../dev/CollisionAudit");
          this.registry.beginWarmUp();
          try {
            return auditCollisions({ camera: this.player.camera, house: this.house, interaction: this.interaction, setBase: (b) => this.player.setBase(b) });
          } finally {
            this.registry.endWarmUp();
          }
        },
        story: this.story,
        horror: this.horror,
        registry: this.registry,
        house: this.house,
        lighting: this.lighting,
        player: this.player,
        scene: this.scene,
        state: this.state,
        audio: this.audio,
        finale: this.finale,
        stage: this.stage,
        save: this.save,
        facts: () => factsOf(this.story.evidence, this.state),
      };
    }

    this.scene.onBeforeRenderObservable.add(() => this.update());
    this.engine.runRenderLoop(() => this.scene.render());

    void this.prepare();
    if (import.meta.env.DEV && SHOWCASE) {
      // Developer-only entity showcase (see dev/showcase/Showcase.ts). Dead code in a production build.
      void import("../dev/showcase/Showcase").then(({ Showcase }) => {
        (window as unknown as { __showcase: unknown }).__showcase = new Showcase({ scene: this.scene, engine: this.engine, horror: this.horror, stage: this.stage, player: this.player, lighting: this.lighting, flashlight: this.flashlight });
      });
    }
    if (import.meta.env.DEV && OBSERVER) {
      void import("../dev/observer/Observer").then(({ Observer }) => {
        this.observer = new Observer({
          scene: this.scene,
          events: this.events,
          state: this.state,
          player: this.player,
          interaction: this.interaction,
          inspection: this.inspection,
          story: this.story,
          horror: this.horror,
          finale: this.finale,
          house: this.house,
          lighting: this.lighting,
          flashlight: this.flashlight,
          audio: this.audio,
          inventory: this.inventory,
          save: this.save,
          phase: () => this.phase,
          /** Starts the story the way the Begin button does, but without needing the pointer lock. */
          begin: () => {
            this.startAudio();
            this.setPhase("playing");
            this.story.begin();
          },
        });
      });
    }
  }

  /** Compiles every shader variant behind the loading screen, then shows the menu. */
  private async prepare(): Promise<void> {
    const nextFrame = () => new Promise<void>((resolve) => this.scene.onAfterRenderObservable.addOnce(() => resolve()));
    await this.scene.whenReadyAsync();
    this.perf.mark("scene-ready");
    // Lamp states differ between rooms (some start off), which changes the shader a mesh needs. Warm both states.
    const lamps = this.lighting.allLamps;
    const states = lamps.map((l) => l.on);
    const flashOn = this.flashlight.on;
    this.registry.beginWarmUp();
    this.horror.warm(true);
    for (const pass of [0, 1, 2]) {
      lamps.forEach((l, i) => l.setOn(pass === 1 ? true : pass === 2 ? false : states[i]));
      this.flashlight.light.setEnabled(pass !== 2);
      await nextFrame();
      await this.scene.whenReadyAsync();
    }
    lamps.forEach((l, i) => l.setOn(states[i]));
    this.flashlight.light.setEnabled(flashOn);
    this.horror.warm(false);
    this.registry.endWarmUp();
    this.perf.mark("shaders-warm");
    await nextFrame();
    this.perf.mark("first-frame");
    this.setPhase("menu");
  }

  private readonly settingsUi: Ui;

  private applySettings(s: SettingsData): void {
    this.engine.setHardwareScalingLevel(1 / s.renderScale);
    this.engine.resize();
    this.audio.setMasterVolume(s.volume);
    this.audio.setDialogueVolume(s.dialogueVolume);
    this.audio.setEffectsVolume(s.effectsVolume);
    this.audio.setReducedIntensity(s.reducedIntensity || s.reducedAudio);
    this.audio.setMusicVolume(s.musicVolume);
    if (this.horror) this.horror.reduced = s.reducedIntensity;
    StoryUi.subtitlesEnabled = s.subtitles;
    this.perf.setVisible(s.showPerf);
  }

  private setPhase(to: GamePhase): void {
    if (to === this.phase) return;
    const from = this.phase;
    this.phase = to;
    this.events.emit("phase:changed", { from, to });
  }

  /** New game: starts the story from the beginning. Any older save is replaced at the first checkpoint. */
  private begin(): void {
    this.save.clear();
    this.startAudio();
    this.lockPointer();
    this.story.begin();
  }

  // ---- saving and loading ---------------------------------------------------------------------

  private saveLabel(): string | null {
    const r = this.save.read();
    if (!r.ok) return null;
    const c = CHAPTERS[Math.max(0, Math.min(CHAPTERS.length - 1, r.data.chapter - 1))];
    return `Chapter ${c.number} · ${c.title.replace(/^[A-Z]+ — /, "")}`;
  }

  /** Everything a save needs. Temporary state (animations, lights, who is on screen) is rebuilt, never saved. */
  private captureSave(): Omit<SaveData, "v" | "savedAt"> {
    const p = this.player.position;
    const level = this.player.floorBase > 1.5 ? 1 : 0;
    const valid = roomAt(p.x, p.z, level) !== null;
    const h = this.horror.snapshot();
    return {
      label: this.saveLabel() ?? "",
      chapter: this.story.chapterNumber,
      flags: this.state.snapshot(),
      evidence: this.story.evidence.snapshot(),
      inventory: this.inventory.list(),
      spoken: this.story.snapshotSpoken(),
      horror: h,
      player: valid ? { x: p.x, z: p.z, level, yaw: this.player.camera.rotation.y } : { x: 6.5, z: 1.0, level: 0, yaw: 0 },
    };
  }

  private applySave(d: SaveData): void {
    this.state.restore(d.flags);
    this.story.evidence.restore(d.evidence);
    this.inventory.restore(d.inventory);
    this.puzzles.reapplySolved();
    this.story.restoreSpoken(d.spoken);
    // Only a position inside a room is accepted; anything else falls back to the foyer, so a bad save cannot trap the player.
    const ok = roomAt(d.player.x, d.player.z, d.player.level) !== null;
    const at = ok ? d.player : { x: 6.5, z: 1.0, level: 0 as const, yaw: 0 };
    this.player.setBase(at.level * 3);
    this.player.position.set(at.x, at.level * 3 + 1.65, at.z);
    this.player.setLook(at.yaw, 0);
    this.story.chapters.restore(d.chapter);
    this.story.syncMemories();
    this.horror.restore(d.horror);
    this.events.emit("inventory:changed", { items: this.inventory.list() });
  }

  private continueGame(): void {
    const r = this.save.read();
    if (!r.ok) {
      const why = r.reason === "newer" ? "That save is from a newer version of the game." : r.reason === "corrupt" ? "That save could not be read, and has been set aside." : "No saved game.";
      this.events.emit("toast", { text: why, ms: 6000 });
      this.settingsUi.refreshMenu();
      return;
    }
    this.startAudio();
    this.lockPointer();
    this.save.load();
    this.story.markResumed();
  }

  private manualSave(): boolean {
    if (this.finale.busy || this.finale.grabbed || this.story.inPrologue) return false;
    const ok = this.save.write();
    if (ok) this.events.emit("save:done", { kind: "manual" });
    return ok;
  }

  /** Checkpoints: a new chapter, a solved puzzle, new evidence, or a taken item. Never during a cinematic or the finale. */
  private setupAutosave(): void {
    const request = (): void => {
      window.clearTimeout(this.saveTimer);
      this.saveTimer = window.setTimeout(() => {
        if (this.finale.busy || this.finale.grabbed || this.story.inPrologue || this.state.get("ending:done") || !this.story.chapters.started) return;
        if (this.save.write()) this.events.emit("save:done", { kind: "auto" });
      }, 1500);
    };
    this.events.on("chapter:changed", ({ restored }) => !restored && request());
    this.events.on("puzzle:solved", request);
    this.events.on("evidence:added", request);
    this.events.on("inventory:changed", request);
  }

  /** The page is reloaded for a clean start: no old ending, entity or lighting state can leak into the menu. */
  private returnToMenu(): void {
    this.manualSave();
    window.location.reload();
  }

  /** Starts audio from a user gesture; failures are shown to the player instead of being swallowed. */
  private startAudio(): void {
    this.audio.start().catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      this.events.emit("toast", { text: `Audio could not start: ${msg}`, ms: 8000 });
    });
  }

  private audioStatus(): string {
    const d = this.audio.diagnostics();
    const err = d.error ? ` · error: ${d.error}` : "";
    return `audio ${d.state} · master ${d.masterGain.toFixed(2)} · output rms ${d.outputRms.toFixed(3)}${err}`;
  }

  private lockPointer(): void {
    try {
      const r: unknown = this.canvas.requestPointerLock();
      if (r instanceof Promise) r.catch(() => undefined);
    } catch {
      /* the pointerlockerror handler recovers */
    }
  }

  /** Closes the journal or tape panel and returns to where the player was. */
  private closeOverlay(): void {
    if (this.overlayReturn === "paused") this.setPhase("paused");
    else this.closeKeypad();
  }

  private closeKeypad(): void {
    if (this.observer) {
      this.setPhase("playing");
      return;
    }
    this.setPhase("resuming");
    this.lockPointer();
    window.clearTimeout(this.resumeTimer);
    this.resumeTimer = window.setTimeout(() => {
      if (this.phase === "resuming") this.setPhase("paused");
    }, 700);
  }

  private onPointerLockChange(): void {
    // The observer drives the game without the pointer lock, so losing it must not open the pause menu.
    if (this.observer) return;
    const locked = document.pointerLockElement === this.canvas;
    if (locked) {
      if (["menu", "paused", "keypad", "resuming"].includes(this.phase)) this.setPhase("playing");
      else if (this.phase === "journal" || this.phase === "recorder" || this.phase === "map") this.setPhase("playing");
      if (this.benchPending) {
        this.benchPending = false;
        this.startBenchmark();
      }
    } else if (this.benchmark.active) {
      this.finishBenchmark(true);
      this.setPhase("paused");
    } else if (this.phase === "playing" || this.phase === "inspecting") {
      this.inspection.close();
      this.setPhase("paused");
    }
  }

  private startBenchmark(): void {
    this.benchDoors = this.house.setAllDoors(true);
    this.perf.beginBench();
    this.benchmark.start();
    this.events.emit("toast", { text: "Benchmark walk started. Press Esc to stop.", ms: 3000 });
  }

  private finishBenchmark(cancelled: boolean): void {
    this.benchmark.stop();
    for (const [id, open] of Object.entries(this.benchDoors)) this.house.doors[id]?.setOpen(open);
    const rows = this.perf.endBench();
    const text = this.formatBench(rows, cancelled);
    (window as unknown as { __benchmark: unknown }).__benchmark = rows;
    console.table(rows.map((r) => ({ ...r, fps: +r.fps.toFixed(1), avgMs: +r.avgMs.toFixed(2), p95Ms: +r.p95Ms.toFixed(2), p99Ms: +r.p99Ms.toFixed(2), maxMs: +r.maxMs.toFixed(1) })));
    this.settingsUi.showBenchResult(text);
    document.exitPointerLock();
  }

  private formatBench(rows: BenchRow[], cancelled: boolean): string {
    const pad = (s: string, n: number) => s.padEnd(n);
    const head = `${pad("room", 18)}${pad("frames", 8)}${pad("fps", 7)}${pad("avg", 8)}${pad("p95", 8)}${pad("p99", 8)}${pad("max", 9)}hitches`;
    const lines = rows.map((r) => `${pad(r.room, 18)}${pad(String(r.frames), 8)}${pad(r.fps.toFixed(0), 7)}${pad(r.avgMs.toFixed(1), 8)}${pad(r.p95Ms.toFixed(1), 8)}${pad(r.p99Ms.toFixed(1), 8)}${pad(r.maxMs.toFixed(1), 9)}${r.hitches}`);
    const info = `${this.perf.report().renderSize} @ scale ${this.settings.data.renderScale} · ${this.perf.report().gpu}`;
    return [cancelled ? "(stopped early)" : "Benchmark walk complete", info, "times in ms", head, ...lines].join("\n");
  }

  private readonly stuck = new StuckGuard();
  private stuckOffered = false;

  /** If the player has been pushing against something for a few seconds without moving, say how to step free; U does it (never during a scene or a grab, never near her). */
  private recovery(dt: number): void {
    const keys = ["KeyW", "KeyA", "KeyS", "KeyD"].some((k) => this.input.isDown(k));
    const p = this.player.position;
    if (this.stuck.update(dt, keys, p.x, p.z)) {
      this.stuckOffered = true;
      this.events.emit("toast", { text: "Stuck? Press U to step free.", ms: 4000 });
    }
    if (!this.input.wasPressed("KeyU") || !this.stuckOffered || this.finale.busy || this.finale.grabbed) return;
    const m = this.horror.matron;
    const near = m.state !== "hidden" ? { x: m.root.position.x, z: m.root.position.z } : null;
    const moved = stepFree(this.scene, this.player, near);
    this.events.emit("toast", { text: moved ? "You step free." : "There is nowhere safe to step to here.", ms: 2500 });
    this.stuckOffered = !moved;
  }

  private update(): void {
    const dt = Math.min(this.engine.getDeltaTime() / 1000, 0.05) * (this.observer?.timeScale ?? 1);
    if (this.input.wasPressed("F3")) {
      this.settings.update({ showPerf: !this.perf.visible });
      this.perf.setVisible(this.settings.data.showPerf);
      this.settingsUi.setPerfChecked(this.settings.data.showPerf);
    }

    const live = this.phase === "playing" || this.phase === "inspecting";
    if (this.phase === "playing" && !this.benchmark.active && this.input.wasPressed("F4")) this.startBenchmark();
    if (this.phase === "playing" && this.benchmark.active) {
      this.input.consumeMouse();
      if (!this.benchmark.update(dt)) this.finishBenchmark(false);
    } else if (this.phase === "playing" && this.controlsLocked) {
      this.player.update(dt, false);
      if (this.dolly) this.player.drift(dt);
      this.interaction.update(false);
      if (this.input.wasPressed("Space") || this.input.wasPressed("Enter")) {
        if (this.finale.busy) this.finale.skip();
        else this.story.skipPrologue();
      }
    } else if (this.phase === "playing") {
      this.player.update(dt, true);
      this.interaction.update(true);
      if (this.input.wasPressed("KeyF")) this.flashlight.toggle();
      this.recovery(dt);
      if (this.input.wasPressed("Space") || this.input.wasPressed("Enter")) this.horror.skipCine();
      if (this.input.wasPressed("KeyJ")) this.events.emit("journal:open", {});
      if (this.input.wasPressed("KeyM")) this.events.emit("map:open", {});
      if (!this.benchmark.active) this.horror.update(dt);
    } else if (this.phase === "inspecting") {
      this.inspection.update();
      this.interaction.update(false);
    } else {
      this.player.update(dt, false);
    }

    // Safety net: nothing may stay held in front of the camera once the game has left the inspection view.
    if (this.phase !== "inspecting" && this.inspection.active) this.inspection.close();
    if (this.phase === "playing") this.finale.update(dt);
    if (live || this.phase === "journal" || this.phase === "recorder") this.story.update(dt);
    else this.story.recordings.update();
    if (live) {
      this.house.update(dt);
      if (this.phase === "playing") this.guide.update(dt);
      const roomName = this.registry.currentRoom ? ROOM_BY_ID[this.registry.currentRoom].name : undefined;
      this.perf.frame(this.engine.getDeltaTime(), roomName);
    }
    this.registry.update(roomAt(this.player.position.x, this.player.position.z, this.player.floorBase > 1.5 ? 1 : 0));
    this.flashlight.update(dt);
    this.lighting.update(dt);
    this.audio.update(this.player.position, this.player.forward);
    this.input.endFrame();
    this.observer?.update(dt);
  }
}
