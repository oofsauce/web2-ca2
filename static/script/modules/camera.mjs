import Vector from "./math/vector.mjs";

export class Camera {
  position = new Vector();
  smoothing = 10;
  #virtualPos = new Vector();
  constructor() {

  }

  tick(dt) {
    this.#virtualPos = Vector.lerp(this.#virtualPos, this.position, dt * this.smoothing);
  }

  /**
   * 
   * @param {CanvasRenderingContext2D} ctx 
   */
  clearTransform(ctx) {
  }

  /**
   * 
   * @param {CanvasRenderingContext2D} ctx 
   */
  setTransform(ctx) {
    ctx.transform(1, 0, 0, 1, -this.#virtualPos.x + ctx.canvas.width/2, -this.#virtualPos.y + ctx.canvas.height/2);
  }
}