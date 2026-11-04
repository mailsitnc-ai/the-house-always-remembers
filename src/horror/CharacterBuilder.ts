import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";

/** A figure's root plus the joints the behaviours move. All meshes are children of `root`. */
export interface Figure {
  root: TransformNode;
  head: TransformNode;
  /** Used for a gentle sway while moving. */
  body: TransformNode;
  meshes: Mesh[];
  height: number;
  /** Matron only: the shoulder pivots of each arm (for gestures) and the jaw morph (0 closed .. 1 open) for speech. */
  arms?: TransformNode[];
  setMouth?: (open: number) => void;
  /** The progressive-horror rig: `set` applies a corruption level (0 composed .. 3 true form), `tick` runs the per-frame behaviour. */
  rig?: {
    set(c: number): void;
    tick(dt: number, talk: number, gaze?: number, ready?: boolean): void;
    post?(): void;
    limit?(maxHeight: number | null): void;
    /** The timed transformation into the true form (about 18 s). `begin` plays it; `seek` freezes it at a time (development captures). */
    begin?(): void;
    seek?(t: number): void;
    readonly duration?: number;
    readonly time?: number;
    readonly playing?: boolean;
    readonly stillness?: number;
  };
}

export { buildMatron } from "./models/MatronModel";

export { buildHollow } from "./models/HollowModel";
export { buildWitness, type WitnessFigure } from "./models/WitnessModel";

export { buildReflection, type ReflectionFigure } from "./models/DanielModel";
