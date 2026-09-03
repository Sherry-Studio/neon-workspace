/** Keyboard + pointer-lock mouse input. One instance per game session. */

export class InputManager {
  private keys = new Set<string>();
  private el: HTMLElement;
  mouseDX = 0;
  mouseDY = 0;
  locked = false;
  /** set once the player has clicked into the scene */
  private engaged = false;
  /** pointer lock unavailable (sandboxed iframe) — fall back to hover-look */
  private lockBlocked = false;
  /** Edge-triggered: true only on the frame the key went down. */
  private pressed = new Set<string>();

  constructor(el: HTMLElement) {
    this.el = el;
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    this.el.addEventListener("click", this.requestLock);
    document.addEventListener("pointerlockchange", this.onLockChange);
    document.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("blur", this.onBlur);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const k = e.code;
    if (!this.keys.has(k)) this.pressed.add(k);
    this.keys.add(k);
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(k)) e.preventDefault();
  };
  private onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.code);
  private onBlur = () => {
    this.keys.clear();
    this.pressed.clear();
  };
  private requestLock = () => {
    this.engaged = true;
    if (this.locked || this.lockBlocked) return;
    try {
      const p = this.el.requestPointerLock?.() as unknown as Promise<void> | undefined;
      if (p && typeof p.catch === "function") p.catch(() => (this.lockBlocked = true));
    } catch {
      this.lockBlocked = true;
    }
  };
  private onLockChange = () => {
    this.locked = document.pointerLockElement === this.el;
  };
  private onMouseMove = (e: MouseEvent) => {
    // locked: use raw movement. Not locked (sandboxed preview): still allow
    // look once the player has engaged, so the game is playable everywhere.
    if (this.locked || (this.engaged && this.lockBlocked)) {
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    }
  };

  down(code: string) {
    return this.keys.has(code);
  }
  /** Was this key pressed since the last consumeFrame()? */
  justPressed(code: string) {
    return this.pressed.has(code);
  }
  axis() {
    let x = 0;
    let y = 0;
    if (this.down("KeyW") || this.down("ArrowUp")) y += 1;
    if (this.down("KeyS") || this.down("ArrowDown")) y -= 1;
    if (this.down("KeyA") || this.down("ArrowLeft")) x -= 1;
    if (this.down("KeyD") || this.down("ArrowRight")) x += 1;
    return { x, y };
  }
  run() {
    return this.down("ShiftLeft") || this.down("ShiftRight");
  }
  /** Call once at the end of every frame. */
  endFrame() {
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.pressed.clear();
  }
  dispose() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.el.removeEventListener("click", this.requestLock);
    document.removeEventListener("pointerlockchange", this.onLockChange);
    document.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("blur", this.onBlur);
  }
}
