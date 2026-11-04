import type { EventBus, GamePhase } from "../core/EventBus";
import type { SettingsData } from "../platform/Settings";

export interface UiHandlers {
  onBegin(): void;
  onResume(): void;
  onSettings(patch: Partial<SettingsData>): void;
  /** Returns true if the code was correct. */
  onKeypadSubmit(id: string, code: string): boolean;
  onKeypadClose(): void;
  codeLength(id: string): number;
  onTestSound(): void;
  /** Called when the volume slider is released, so the player hears the new level. */
  onVolumeCommit(): void;
  audioStatus(): string;
  onBenchmark(): void;
  onJournal(): void;
  onMap(): void;
  onContinue(): void;
  onSave(): boolean;
  onToMenu(): void;
  onClearSave(): void;
  onCredits(): void;
  /** Text for the Continue button, or null when there is no save. */
  saveLabel(): string | null;
}

function el<T extends HTMLElement>(id: string): T {
  const e = document.getElementById(id);
  if (!e) throw new Error(`Missing element #${id}`);
  return e as T;
}

/** All DOM overlays: menus, prompts, toasts, inspection text and the keypad. Game logic never touches the DOM directly. */
export class Ui {
  private readonly prompt = el("prompt");
  private readonly toast = el("toast");
  private toastTimer = 0;
  private keypadId = "";
  private entered = "";
  private readonly display = el("kp-display");

  constructor(
    events: EventBus,
    private readonly handlers: UiHandlers,
    settings: SettingsData,
  ) {
    el("btn-begin").addEventListener("click", () => handlers.onBegin());
    el("btn-resume").addEventListener("click", () => handlers.onResume());

    const scale = el<HTMLSelectElement>("set-scale");
    const volume = el<HTMLInputElement>("set-volume");
    const perf = el<HTMLInputElement>("set-perf");
    scale.value = String(settings.renderScale);
    volume.value = String(settings.volume);
    perf.checked = settings.showPerf;
    scale.addEventListener("change", () => handlers.onSettings({ renderScale: Number(scale.value) }));
    volume.addEventListener("input", () => handlers.onSettings({ volume: Number(volume.value) }));
    const reduced = el<HTMLInputElement>("set-reduced");
    reduced.checked = settings.reducedIntensity;
    reduced.addEventListener("change", () => handlers.onSettings({ reducedIntensity: reduced.checked }));
    const dialogue = el<HTMLInputElement>("set-dialogue");
    const effects = el<HTMLInputElement>("set-effects");
    dialogue.value = String(settings.dialogueVolume);
    effects.value = String(settings.effectsVolume);
    dialogue.addEventListener("input", () => handlers.onSettings({ dialogueVolume: Number(dialogue.value) }));
    effects.addEventListener("input", () => handlers.onSettings({ effectsVolume: Number(effects.value) }));
    perf.addEventListener("change", () => handlers.onSettings({ showPerf: perf.checked }));
    volume.addEventListener("change", () => {
      handlers.onVolumeCommit();
      this.refreshAudioStatus();
    });
    el("btn-bench").addEventListener("click", () => handlers.onBenchmark());
    el("btn-journal").addEventListener("click", () => handlers.onJournal());
    el("btn-map").addEventListener("click", () => handlers.onMap());
    el("btn-audiotest").addEventListener("click", () => {
      handlers.onTestSound();
      window.setTimeout(() => this.refreshAudioStatus(), 400);
    });

    // Main menu, save and settings controls.
    const msg = (id: string, text: string, ms = 4000): void => {
      const m = el(id);
      m.textContent = text;
      window.setTimeout(() => (m.textContent = ""), ms);
    };
    const armed = new Set<string>();
    /** Two clicks within five seconds, so a stray click cannot destroy progress. */
    const confirmed = (key: string, button: HTMLElement, normal: string, warn: string): boolean => {
      if (armed.has(key)) {
        armed.delete(key);
        button.textContent = normal;
        return true;
      }
      armed.add(key);
      button.textContent = warn;
      window.setTimeout(() => {
        armed.delete(key);
        button.textContent = normal;
      }, 5000);
      return false;
    };
    el("btn-continue").addEventListener("click", () => handlers.onContinue());
    const bBegin = el("btn-begin");
    el("btn-begin").addEventListener("click", () => {
      if (!handlers.saveLabel() || confirmed("new", bBegin, "NEW GAME", "REPLACE SAVED GAME? CLICK AGAIN")) handlers.onBegin();
    });
    const bClear = el("btn-clear");
    bClear.addEventListener("click", () => {
      if (!confirmed("clear", bClear, "CLEAR SAVE DATA", "DELETE SAVE? CLICK AGAIN")) return;
      handlers.onClearSave();
      this.refreshMenu();
      msg("menu-msg", "Save data cleared.");
    });
    el("btn-credits").addEventListener("click", () => handlers.onCredits());
    for (const id of ["btn-settings", "btn-pause-settings"]) el(id).addEventListener("click", () => el("settings").classList.add("show"));
    el("btn-settings-back").addEventListener("click", () => el("settings").classList.remove("show"));
    el("btn-save").addEventListener("click", () => msg("save-msg", handlers.onSave() ? "Game saved." : "Could not save right now (storage is unavailable, or a scene is in progress)."));
    const bMenu = el("btn-tomenu");
    bMenu.addEventListener("click", () => {
      if (confirmed("menu", bMenu, "RETURN TO MAIN MENU", "PROGRESS IS SAVED. CLICK AGAIN")) handlers.onToMenu();
    });
    const subs = el<HTMLInputElement>("set-subtitles");
    const soft = el<HTMLInputElement>("set-soft");
    const music = el<HTMLInputElement>("set-music");
    subs.checked = settings.subtitles;
    soft.checked = settings.reducedAudio;
    music.value = String(settings.musicVolume);
    subs.addEventListener("change", () => handlers.onSettings({ subtitles: subs.checked }));
    soft.addEventListener("change", () => handlers.onSettings({ reducedAudio: soft.checked }));
    music.addEventListener("input", () => handlers.onSettings({ musicVolume: Number(music.value) }));
    this.refreshMenu();

    this.buildKeypad();
    el("kp-close").addEventListener("click", () => handlers.onKeypadClose());
    window.addEventListener("keydown", (e) => this.onKey(e));

    events.on("phase:changed", ({ to }) => this.showPhase(to));
    events.on("hint", ({ text }) => this.setPrompt(text));
    events.on("toast", ({ text, ms }) => this.showToast(text, ms));
    events.on("inspect:open", ({ title, text }) => {
      el("inspect-title").textContent = title;
      el("inspect-text").textContent = text;
    });
    events.on("keypad:open", ({ id }) => this.openKeypad(id));
    events.on("inventory:changed", ({ items }) => {
      el("inventory").textContent = items.length ? `Carrying: ${items.map((i) => i.name).join(", ")}` : "";
    });
    events.on("room:changed", ({ room }) => this.showRoom(room));
  }

  setPerfChecked(v: boolean): void {
    el<HTMLInputElement>("set-perf").checked = v;
  }

  /** Shows Continue and Clear only when there is a save. */
  refreshMenu(): void {
    const label = this.handlers.saveLabel();
    const c = el("btn-continue");
    c.style.display = label ? "" : "none";
    if (label) c.textContent = `CONTINUE · ${label}`;
    el("btn-clear").style.display = label ? "" : "none";
  }

  private showPhase(phase: GamePhase): void {
    const visible: Record<string, boolean> = {
      loading: phase === "loading",
      menu: phase === "menu",
      pause: phase === "paused",
      inspect: phase === "inspecting",
      keypad: phase === "keypad",
    };
    for (const [id, show] of Object.entries(visible)) el(id).classList.toggle("show", show);
    if (phase === "paused") this.refreshAudioStatus();
    if (phase === "menu") this.refreshMenu();
    if (phase !== "paused" && phase !== "menu") el("settings").classList.remove("show");
    el("dot").style.display = phase === "playing" || phase === "inspecting" ? "block" : "none";
    if (phase !== "playing") this.setPrompt(null);
  }

  private roomTimer = 0;

  private showRoom(name: string): void {
    const label = el("room-label");
    label.textContent = name;
    label.classList.add("show");
    window.clearTimeout(this.roomTimer);
    this.roomTimer = window.setTimeout(() => label.classList.remove("show"), 2200);
  }

  /** Shows the benchmark table in the pause menu. */
  showBenchResult(text: string): void {
    el("bench-result").textContent = text;
  }

  private refreshAudioStatus(): void {
    el("audio-status").textContent = this.handlers.audioStatus();
  }

  private setPrompt(text: string | null): void {
    this.prompt.textContent = text ?? "";
    this.prompt.classList.toggle("show", !!text);
  }

  private showToast(text: string, ms = 3500): void {
    this.toast.textContent = text;
    this.toast.classList.add("show");
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toast.classList.remove("show"), ms);
  }

  // ---- keypad ----------------------------------------------------------------------------------

  private buildKeypad(): void {
    const pad = el("kp-pad");
    for (const key of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "OK"]) {
      const b = document.createElement("button");
      b.textContent = key;
      b.addEventListener("click", () => this.press(key));
      pad.appendChild(b);
    }
  }

  private openKeypad(id: string): void {
    this.keypadId = id;
    this.entered = "";
    this.renderDisplay();
  }

  private onKey(e: KeyboardEvent): void {
    if (!el("keypad").classList.contains("show")) return;
    if (/^[0-9]$/.test(e.key)) this.press(e.key);
    else if (e.key === "Backspace") this.press("C");
    else if (e.key === "Enter") this.press("OK");
    else if (e.key === "Escape") this.handlers.onKeypadClose();
  }

  private press(key: string): void {
    const max = this.handlers.codeLength(this.keypadId);
    this.display.classList.remove("bad");
    if (key === "C") this.entered = "";
    else if (key === "OK") this.submit();
    else if (this.entered.length < max) this.entered += key;
    this.renderDisplay();
  }

  private submit(): void {
    if (this.handlers.onKeypadSubmit(this.keypadId, this.entered)) return;
    this.entered = "";
    this.display.classList.add("bad");
  }

  private renderDisplay(): void {
    const max = this.handlers.codeLength(this.keypadId);
    this.display.textContent = this.entered.padEnd(max, "·");
  }
}
