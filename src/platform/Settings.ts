export interface SettingsData {
  renderScale: number;
  volume: number;
  dialogueVolume: number;
  effectsVolume: number;
  reducedIntensity: boolean;
  /** Softens sudden sounds only. Reduced scare intensity does this and also tones down visual jolts. */
  reducedAudio: boolean;
  subtitles: boolean;
  musicVolume: number;
  showPerf: boolean;
}

const KEY = "thar.settings.v1";
const DEFAULTS: SettingsData = { renderScale: 0.75, volume: 0.8, dialogueVolume: 1, effectsVolume: 1, reducedIntensity: false, reducedAudio: false, subtitles: true, musicVolume: 1, showPerf: false };

/** Persisted user settings. Storage can be blocked (private windows), so every access is guarded. */
export class Settings {
  data: SettingsData = { ...DEFAULTS };

  constructor() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) this.data = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<SettingsData>) };
    } catch {
      /* keep defaults */
    }
  }

  update(patch: Partial<SettingsData>): void {
    this.data = { ...this.data, ...patch };
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* ignore */
    }
  }
}
