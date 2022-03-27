import Player from "./player.mjs";
import Renderer from "./renderer.mjs";
import { addEventListener } from "./spa.mjs";

import * as input from './input.mjs';
import * as ui from './ui/ui.mjs';

/** Physics tick rate, in hz */
export const PHYSICS_RATE = 20;
/** Physics tick interval, in seconds */
export const PHYSICS_INTER = 1/PHYSICS_RATE;

export default class Game {
  #loaded = false;
  /** @type {Renderer} */
  #renderer;

  #player = new Player();

  // DT calculation
  #then;
  #time = 0; // time collector to be eaten by physics tick

  get loaded() {
    return this.#loaded;
  }

  constructor(renderer) {
    this.#renderer = renderer;
    console.debug("PHYSICS_RATE", PHYSICS_RATE);
    console.debug("PHYSICS_INTER", PHYSICS_INTER);
  }

  async load() {
    if(this.#loaded) return;
    console.debug("Loading game...");

    this.#loaded = true;
  }

  start() {
    this.#renderer.conformToParent();
    window.requestAnimationFrame(this.#draw.bind(this));
  }

  destroy() {
    if(!this.#loaded) return; // no need to unload anything if not loaded
    console.debug("Destroying game...");
  }

  ////// ACTUAL GAME STUFF

  /**
   * Render a frame.
   * @param {DOMHighResTimeStamp} now 
   */
  #draw(now) {
    if(!this.#then) {
      this.#then = now;
    }
    const dt = (now-this.#then)/1000;
    this.#time += dt;
    // has enough time passed for physics tick?
    if (this.#time > PHYSICS_INTER) {
      this.#time -= PHYSICS_INTER; // consume time taken by the tick
      this.#tick();
    }


    const ctx = this.#renderer.ctx;
    ctx.fillStyle = "black";
    ctx.fillRect(0,0, this.#renderer.w, this.#renderer.h);

    ctx.fillStyle = "white";
    ctx.font = "20px monospace";
    ui.startVertical();
    ui.text(ctx, `frametime: ${(dt*1000).toFixed(3)}`);
    ui.text(ctx,  'hello');
    ui.text(ctx,  'hello');
    ui.text(ctx,  'hello');
    ui.text(ctx,  'hello');
    ui.startHorizontal();
    ui.text(ctx,  'a');
    ui.text(ctx,  'b');
    ui.text(ctx,  'c');
    ui.endHorizontal();
    ui.text(ctx,  'hello');
    ui.text(ctx,  'hello');
    ui.text(ctx,  'hello');
    ui.text(ctx,  'hello');
    ui.text(ctx,  'hello');
    ui.text(ctx,  'hello');
    ui.endVertical();
    this.#player.render(ctx, dt);

    const mouse = input.mouse();
    ctx.fillRect(mouse.x - 5, mouse.y - 5, 10, 10);

    this.#then = now;
    window.requestAnimationFrame(this.#draw.bind(this));
    input.tick();
  }

  /**
   * Do a physics tick.
   */
  #tick() {
    this.#player.tick(PHYSICS_INTER);
  }
}