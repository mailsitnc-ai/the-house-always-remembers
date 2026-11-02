import { Scene } from "@babylonjs/core/scene";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { ImageProcessingConfiguration } from "@babylonjs/core/Materials/imageProcessingConfiguration";
import type { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { RoomId } from "../world/Layout";

export interface LampOptions {
  color?: Color3;
  range?: number;
  intensity?: number;
  /** 0 = steady, ~0.1 = subtle electrical instability. */
  flicker?: number;
  on?: boolean;
  /** Whether atmospheric events (see FearDirector) may dim this lamp. */
  eventDimmable?: boolean;
  /** Size in metres of the halo drawn around the bulb. 0 for none. */
  glow?: number;
  /** Fluorescent-style flicker when switched on. */
  startup?: boolean;
}

export class Lamp {
  on: boolean;
  /** True while the lamp's room is far from the player; the light is then switched off to save shader work. */
  culled = false;
  shade: StandardMaterial | null = null;
  glow = new Color3(0.9, 0.62, 0.32);
  /** Room this lamp lights; set when it is registered with the house. */
  room: RoomId | null = null;
  /** Current brightness 0..1. It eases toward on/off so lamps fade rather than snap. */
  level: number;
  halo: Mesh | null = null;
  startup = false;
  startupLeft = 0;
  /** Extra multiplier used by scripted disturbances (1 = normal). */
  disturb = 1;

  constructor(
    readonly light: PointLight,
    readonly baseIntensity: number,
    readonly flicker: number,
    readonly eventDimmable: boolean,
    on: boolean,
  ) {
    this.on = on;
    this.level = on ? 1 : 0;
    this.apply();
  }

  setOn(on: boolean): void {
    if (on && !this.on && this.startup) this.startupLeft = 0.5;
    this.on = on;
    this.apply();
    if (this.shade) this.shade.emissiveColor = on ? this.glow : new Color3(0.05, 0.04, 0.03);
  }

  setCulled(culled: boolean): void {
    this.culled = culled;
    this.apply();
  }

  apply(): void {
    const lit = (this.on || this.level > 0.02) && !this.culled;
    this.light.setEnabled(lit);
    this.halo?.setEnabled(lit);
  }
}

/**
 * Owns the global look (ambient level, fog, tonemapping, vignette) and every lamp.
 * Ambient is deliberately very low so dark corners stay dark; warmth comes from lamps.
 */
export class LightingManager {
  private readonly lamps: Lamp[] = [];
  private dipRemaining = 0;
  private dipDuration = 0;
  private time = 0;
  private fogTarget = 0.03;
  /** The fog colour the scene eases toward: warm in lived-in rooms, cold in passages and upstairs. */
  private readonly fogTint = new Color3(0.02, 0.019, 0.017);
  private glowMat: StandardMaterial | null = null;

  constructor(private readonly scene: Scene) {
    scene.clearColor.set(0.012, 0.011, 0.01, 1);
    scene.ambientColor = new Color3(0.06, 0.055, 0.05);
    scene.fogMode = Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.03;
    scene.fogColor = new Color3(0.02, 0.019, 0.017);

    const ip = scene.imageProcessingConfiguration;
    ip.toneMappingEnabled = true;
    ip.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
    ip.exposure = 1.1;
    ip.contrast = 1.15;
    ip.vignetteEnabled = true;
    ip.vignetteWeight = 2.4;
    ip.vignetteStretch = 0.4;
  }

  createLamp(name: string, position: Vector3, o: LampOptions = {}): Lamp {
    const light = new PointLight(name, position, this.scene);
    light.diffuse = o.color ?? new Color3(1, 0.8, 0.55);
    light.specular = new Color3(0.2, 0.15, 0.1);
    light.range = o.range ?? 6.5;
    const base = o.intensity ?? 1.3;
    light.intensity = base;
    const lamp = new Lamp(light, base, o.flicker ?? 0, o.eventDimmable ?? false, o.on ?? true);
    lamp.startup = !!o.startup;
    const size = o.glow ?? 0.9;
    if (size > 0 && this.glowMat) {
      const halo = MeshBuilder.CreatePlane(`${name}-halo`, { size }, this.scene);
      halo.position.copyFrom(position);
      halo.billboardMode = Mesh.BILLBOARDMODE_ALL;
      halo.material = this.glowMat;
      halo.isPickable = false;
      halo.renderingGroupId = 0;
      lamp.halo = halo;
      lamp.apply();
    }
    this.lamps.push(lamp);
    return lamp;
  }

  /** Briefly drops every event-dimmable lamp, then lets it recover. */
  dip(seconds: number): void {
    this.dipRemaining = seconds;
    this.dipDuration = seconds;
  }

  /** Shared additive material for lamp halos. Set once the material library exists. */
  setGlowMaterial(m: StandardMaterial): void {
    this.glowMat = m;
  }

  get allLamps(): readonly Lamp[] {
    return this.lamps;
  }

  /** Fog density the scene eases toward (set per room). */
  setFogTarget(density: number, tint?: [number, number, number]): void {
    this.fogTarget = density;
    if (tint) this.fogTint.set(tint[0], tint[1], tint[2]);
  }

  update(dt: number): void {
    this.time += dt;
    const k = 1 - Math.exp(-1.5 * dt);
    this.scene.fogDensity += (this.fogTarget - this.scene.fogDensity) * k;
    const fc = this.scene.fogColor;
    fc.r += (this.fogTint.r - fc.r) * k;
    fc.g += (this.fogTint.g - fc.g) * k;
    fc.b += (this.fogTint.b - fc.b) * k;
    this.scene.clearColor.set(fc.r * 0.6, fc.g * 0.6, fc.b * 0.6, 1);
    let dipFactor = 1;
    if (this.dipRemaining > 0) {
      this.dipRemaining = Math.max(0, this.dipRemaining - dt);
      const p = 1 - this.dipRemaining / this.dipDuration; // 0..1
      dipFactor = p < 0.15 ? 1 - p / 0.15 * 0.92 : 0.08 + 0.92 * ((p - 0.15) / 0.85) ** 2;
    }
    for (const l of this.lamps) {
      const target = l.on ? 1 : 0;
      if (l.startupLeft > 0) {
        l.startupLeft -= dt;
        l.level = Math.random() < 0.55 ? 0.15 : 1;
      } else {
        l.level += (target - l.level) * (1 - Math.exp(-13 * dt));
      }
      if (l.level < 0.02 && !l.on) {
        l.level = 0;
        l.apply();
        continue;
      }
      const wobble = l.flicker ? Math.sin(this.time * 13.1) * Math.sin(this.time * 7.3 + 1.2) : 0;
      const k = l.level * (1 + l.flicker * wobble) * (l.eventDimmable ? dipFactor : 1) * l.disturb;
      l.light.intensity = l.baseIntensity * k;
      if (l.halo) l.halo.visibility = Math.max(0, Math.min(1, k * 0.7));
    }
  }
}
