import Player from "./player.mjs";
import Renderer from "./renderer.mjs";

import * as input from './input/mod.mjs';
import { FONTS, PHYSICS_INTER } from "./constants.mjs";


export default class Game {
  #loaded = false;
  /** @type {Renderer} */
  #renderer;

  #player = new Player();

  get loaded() {
    return this.#loaded;
  }

  constructor(renderer) {
    this.#renderer = renderer;
    this.#renderer.onDraw = this.draw.bind(this);
    this.#renderer.onTick = this.tick.bind(this);
    this.#renderer.onUI = this.ui.bind(this);
  }

  async load() {
    if(this.#loaded) return;
    console.debug("Loading game...");

    this.#loaded = true;
  }

  start() {
  }

  destroy() {
    if(!this.#loaded) return; // no need to unload anything if not loaded
    console.debug("Destroying game...");
  }

  ////// ACTUAL GAME STUFF

  /**
   * 
   * @param {number} dt Deltatime in seconds
   * @param {UI} ui UI Object
   */
  ui(dt, ui) { 
    ui.font.color = "white";
    ui.font.family = FONTS.MONO;
    ui.startVertical();
    ui.text(`frametime: ${(dt*1000).toFixed(3)}`);
    ui.endVertical();
  }

  /**
   * Render a frame.
   * @param {number} dt
   * @param {CanvasRenderingContext2D} ctx 
   */
  draw(dt, ctx) {
    this.#player
      .render(dt, ctx);
  }

  /**
   * Do a physics tick.
   */
  tick() {
    this.#player.tick(PHYSICS_INTER);
    this.#renderer.camera.position = this.#player.position;
  }
}