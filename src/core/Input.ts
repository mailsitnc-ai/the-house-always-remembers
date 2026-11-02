/** Keyboard state and accumulated mouse movement (only while the pointer is locked to the canvas). */
export class Input {
  private readonly down = new Set<string>();
  private readonly pressed = new Set<string>();
  private dx = 0;
  private dy = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    window.addEventListener("keydown", (e) => {
      if (e.code === "F3" || e.code === "Space") e.preventDefault();
      if (!e.repeat) this.pressed.add(e.code);
      this.down.add(e.code);
    });
    window.addEventListener("keyup", (e) => this.down.delete(e.code));
    window.addEventListener("blur", () => this.down.clear());
    window.addEventListener("mousemove", (e) => {
      if (document.pointerLockElement !== this.canvas) return;
      this.dx += e.movementX;
      this.dy += e.movementY;
    });
  }

  isDown(code: string): boolean {
    return this.down.has(code);
  }

  /** True once per key press (edge-triggered). */
  wasPressed(code: string): boolean {
    return this.pressed.has(code);
  }

  consumeMouse(): { dx: number; dy: number } {
    const out = { dx: this.dx, dy: this.dy };
    this.dx = 0;
    this.dy = 0;
    return out;
  }

  endFrame(): void {
    this.pressed.clear();
  }
}
