'use strict';

import Rect from "./math/rect.mjs";
import Vector from "./math/vector.mjs";
import World from "./world.mjs";

const SUBSTEPS = 10;

export default class Entity {
  #virtualPos = new Vector(); // virtual position for interpolation
  position = new Vector();
  velocity = new Vector();
  /** @type {Rect} */
  #rect;

  input = new Vector();
  speed = 0;
  drag = 0.5;

  
  get virtualPosition (){return this.#virtualPos;}

  /**
   * 
   * @param {Vector} position 
   * @param {Vector} size 
   */
  constructor(position, size) {
    this.position = position;
    this.#virtualPos = position;
    this.#rect = new Rect(0,0,size.x,size.y);
  }

  /**
   * Do a tick.
   * @param {number} dt
   */
  tick(dt) {

  }

  /**
   * Do a fixed rate physics tick.
   * @param {number} dt
   * @param {World} world
   */
  physics(dt, world) {
    this.velocity.mul(this.drag);
    // naive, needs substeppage to feel tight
    for(let i = 0; i < SUBSTEPS; i++) {
      const newPos = Vector.add(this.position, this.velocity.clone().div(SUBSTEPS));
      this.#rect.top = this.position.y - this.#rect.height/2;
      this.#rect.left = newPos.x - this.#rect.width/2;
      let hit = world.map.tileCollides(this.#rect);
      if(hit) {
        newPos.x = this.position.x;
        this.velocity.x = 0;
        this.#rect.left = this.position.x - this.#rect.width/2;
      }
      this.#rect.top = newPos.y - this.#rect.height/2;
      hit = world.map.tileCollides(this.#rect);
      if(hit) {
        newPos.y = this.position.y;
        this.velocity.y = 0;
      }
      this.position = newPos;
    }
  }

  /**
   * @param {number} dt Delta-time in seconds 
   * @param {CanvasRenderingContext2D} ctx 2D Context
   */
  render(dt, ctx) {
    this.#virtualPos = Vector.lerp(this.#virtualPos, this.position, 0.2);
    ctx.fillRect(this.#virtualPos.x-this.#rect.width/2, this.#virtualPos.y-this.#rect.height/2, this.#rect.width, this.#rect.height);
  }
}