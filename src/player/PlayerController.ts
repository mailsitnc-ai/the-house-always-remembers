import type { Scene } from "@babylonjs/core/scene";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import "@babylonjs/core/Collisions/collisionCoordinator";
import type { Input } from "../core/Input";
import { floorHeight, roomAt } from "../world/Layout";
import type { AudioManager } from "../atmosphere/AudioManager";

const EYE_HEIGHT = 1.65;
const WALK = 1.7;
const RUN = 3.1;
const LOOK_SENSITIVITY = 0.0022;

/**
 * First-person controller. Input and look are ours; Babylon only resolves wall collisions
 * (ellipsoid vs. meshes with checkCollisions) from the camera's cameraDirection vector.
 */
export class PlayerController {
  readonly camera: FreeCamera;
  private yaw = 0;
  private pitch = 0;
  private bobPhase = 0;
  private stepDistance = 0;
  private velX = 0;
  private velZ = 0;
  private base = 0;
  /** Mouse movement since the last reset; used to let the player take a camera guide back at once. */
  private lookMoved = 0;

  constructor(
    scene: Scene,
    private readonly input: Input,
    private readonly audio: AudioManager,
  ) {
    scene.collisionsEnabled = true;
    this.camera = new FreeCamera("player", new Vector3(0, EYE_HEIGHT, 0.9), scene);
    this.camera.minZ = 0.05;
    this.camera.maxZ = 40;
    this.camera.fov = 1.15;
    this.camera.inputs.clear();
    this.camera.inertia = 0;
    this.camera.checkCollisions = true;
    this.camera.applyGravity = false;
    // The ellipsoid hangs below the camera, so its top is eye level and its bottom just clears the floor.
    this.camera.ellipsoid = new Vector3(0.28, 0.8, 0.28);
    scene.activeCamera = this.camera;
  }

  /** Height of the floor under the player (0, 3, or somewhere on the stairs). */
  get floorBase(): number {
    return this.base;
  }

  setBase(base: number): void {
    this.base = base;
  }

  setLook(yaw: number, pitch = 0): void {
    this.yaw = yaw;
    this.pitch = pitch;
    this.camera.rotation.set(pitch, yaw, 0);
  }

  get position(): Vector3 {
    return this.camera.position;
  }

  get forward(): Vector3 {
    return this.camera.getDirection(Vector3.Forward());
  }

  /** Gently turns the view toward a point. Returns false once the player moves the mouse, which cancels the guide. */
  guideLook(target: Vector3, rate: number, dt: number): boolean {
    if (this.lookMoved > 90) return false;
    const p = this.camera.position;
    const wantYaw = Math.atan2(target.x - p.x, target.z - p.z);
    const wantPitch = -Math.atan2(target.y - p.y, Math.hypot(target.x - p.x, target.z - p.z));
    let dy = wantYaw - this.yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    const step = rate * dt;
    this.yaw += Math.max(-step, Math.min(step, dy));
    this.pitch += Math.max(-step, Math.min(step, wantPitch - this.pitch));
    this.camera.rotation.set(this.pitch, this.yaw, 0);
    return true;
  }

  resetLookMoved(): void {
    this.lookMoved = 0;
  }

  /** What the player is walking on, from the room and whether they are on the stairs. */
  private surface(): "wood" | "tile" | "lino" | "carpet" | "stairs" {
    const level = this.base > 1.5 ? 1 : 0;
    const p = this.camera.position;
    const room = roomAt(p.x, p.z, level);
    if (!room) return "stairs";
    if (room === "kitchen") return "lino";
    if (room === "bathroom" || room === "foyer") return "tile";
    if (room === "living" || room === "daniel" || room === "emily" || room === "study") return "carpet";
    return "wood";
  }

  /** Scripted forward drift for cinematics; the usual wall collisions still apply. */
  drift(dt: number, speed = 0.4): void {
    const d = new Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)).scale(speed * dt);
    this.camera.cameraDirection.addInPlace(d);
  }

  /** @param active false while a menu or inspection has control; look and movement are frozen. */
  update(dt: number, active: boolean): void {
    this.base = floorHeight(this.camera.position.x, this.camera.position.z, this.base);
    if (!active) {
      this.camera.position.y = this.base + EYE_HEIGHT;
      this.input.consumeMouse();
      this.velX = this.velZ = 0;
      this.camera.cameraDirection.setAll(0);
      return;
    }

    const { dx, dy } = this.input.consumeMouse();
    this.lookMoved += Math.abs(dx) + Math.abs(dy);
    this.yaw += dx * LOOK_SENSITIVITY;
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch + dy * LOOK_SENSITIVITY));
    this.camera.rotation.set(this.pitch, this.yaw, 0);

    const fwd = (this.input.isDown("KeyW") ? 1 : 0) - (this.input.isDown("KeyS") ? 1 : 0);
    const strafe = (this.input.isDown("KeyD") ? 1 : 0) - (this.input.isDown("KeyA") ? 1 : 0);
    const running = this.input.isDown("ShiftLeft") || this.input.isDown("ShiftRight");
    const speed = running ? RUN : WALK;
    const len = Math.hypot(fwd, strafe) || 1;

    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    const targetX = ((sin * fwd + cos * strafe) / len) * speed;
    const targetZ = ((cos * fwd - sin * strafe) / len) * speed;
    const k = 1 - Math.exp(-12 * dt);
    this.velX += (targetX - this.velX) * k;
    this.velZ += (targetZ - this.velZ) * k;
    this.camera.cameraDirection.set(this.velX * dt, 0, this.velZ * dt);

    const moved = Math.hypot(this.velX, this.velZ);
    this.bobPhase += moved * dt * 5.2;
    this.camera.position.y = this.base + EYE_HEIGHT + Math.sin(this.bobPhase) * 0.018 * Math.min(1, moved / WALK);

    this.stepDistance += moved * dt;
    const stride = running ? 1.15 : 0.8;
    if (this.stepDistance > stride && moved > 0.5) {
      this.stepDistance = 0;
      this.audio.footstep(running, this.surface());
    }
  }
}
