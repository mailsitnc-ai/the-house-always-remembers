import type { Scene } from "@babylonjs/core/scene";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { EventBus } from "../core/EventBus";
import type { GameState } from "../core/GameState";
import type { AudioManager } from "../atmosphere/AudioManager";
import type { LightingManager } from "../atmosphere/LightingManager";
import type { Flashlight } from "../atmosphere/Flashlight";
import type { InteractionSystem } from "../player/InteractionSystem";
import type { InspectionSystem } from "../player/InspectionSystem";
import type { PuzzleSystem } from "../systems/PuzzleSystem";
import type { InventorySystem } from "../systems/InventorySystem";
import type { EvidenceSystem } from "../story/EvidenceSystem";
import type { StoryDirector } from "../story/StoryDirector";
import type { Materials } from "./Materials";
import type { RoomId } from "./Layout";
import type { TrackOptions } from "./RoomRegistry";

export type { RoomId } from "./Layout";

/** Everything a world object may need. Passed explicitly instead of using globals. */
export interface WorldContext {
  scene: Scene;
  events: EventBus;
  state: GameState;
  audio: AudioManager;
  lighting: LightingManager;
  flashlight: Flashlight;
  interaction: InteractionSystem;
  inspection: InspectionSystem;
  puzzles: PuzzleSystem;
  inventory: InventorySystem;
  evidence: EvidenceSystem;
  story: StoryDirector;
  mats: Materials;
  /** Registers a mesh with rooms (auto-detected from position if omitted). */
  track(mesh: AbstractMesh, rooms?: RoomId[], opts?: TrackOptions): void;
  /** Forgets a mesh that is about to be disposed. */
  untrack(mesh: AbstractMesh): void;
  /** Registers a lamp with its room so its light stays inside the room and is culled when the room is far away. */
  registerLamp(lamp: import("../atmosphere/LightingManager").Lamp, room: RoomId): void;
}
