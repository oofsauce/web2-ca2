'use strict';
import UI from './ui/ui.mjs';
import * as input from './input/mod.mjs';
import { PHYSICS_INTER } from './constants.mjs';
import { Camera } from './camera.mjs';
import * as debug from './ui/debug.mjs';
export default class Renderer {
  /** @type {HTMLCanvasElement} */
  #canvas;
  /** @type {CanvasRenderingContext2D} */
  #ctx;
  #w;
  #h;
  get width() { return this.#w; }
  get height() { return this.#h; }

  get canvas() {return this.#canvas};

  camera;

  /** @type {UI} */
  #ui;

  // DT calculation
  #then;
  #time = 0; // time collector to be eaten by physics tick
  onDraw;
  onTick;
  onPhysics;
  onUI;

  #blurred = false;
  /**
   * @param {HTMLCanvasElement} canvas 
   */
  constructor(canvas) {
    this.#canvas = canvas;
    this.#w = canvas.width;
    this.#h = canvas.height;

    this.#ctx = canvas.getContext('2d');
    this.#ui = new UI(this.#ctx);

    this.camera = new Camera();

    window.addEventListener("focus", () => {
      this.#blurred = false;
      this.#then = null;
      window.requestAnimationFrame(this.#loop.bind(this));
    })
    window.addEventListener("blur", () => {this.#blurred = true;})

    window.addEventListener("resize", () => {
      if(document.fullscreenEnabled) return this.fullscreen_change();
      this.conformToParent();
      this.conformToParent();
    });
    canvas.addEventListener("fullscreenchange", this.fullscreen_change.bind(this));
    canvas.addEventListener("mozfullscreenchange", this.fullscreen_change.bind(this));
    canvas.addEventListener("webkitfullscreenchange", this.fullscreen_change.bind(this));
    window.requestAnimationFrame(this.#loop.bind(this));
  }

  fullscreen_change() {
    if(document.fullscreenElement) {
      const rect = this.canvas.getBoundingClientRect();
      this.setSize(rect.width, rect.height);
    } else {
      this.conformToParent();
      this.conformToParent();
    }
  }

  listen(draw, ui, tick, physics) {
    this.onDraw = draw;
    this.onUI = ui;
    this.onTick = tick;
    this.onPhysics = physics;
  }

  #loop(now) {
    if(this.#blurred) return;
    if(!this.#then) {
      this.#then = now;
    }
    const dt = (now-this.#then)/1000;
    this.#time += dt;
    // has enough time passed for physics tick?
    if (this.#time > PHYSICS_INTER) { // FIXME: window blur causes time to keep accumulating without getting consumed
      this.#time -= PHYSICS_INTER; // consume time taken by the tick
      if(this.onPhysics) this.onPhysics(PHYSICS_INTER);
    }
    this.#ctx.imageSmoothingEnabled = false;
    this.#ctx.resetTransform();
    this.#ctx.save();
    this.#ctx.fillStyle = "#9A9C9C";
    this.#ctx.fillRect(0,0, this.width, this.height);
    this.#ctx.restore();
    this.#ctx.save();
    this.camera.setTransform(this.#ctx);
    if(this.onDraw) this.onDraw(dt, this.#ctx);
    debug.draw(dt, this.#ctx);
    
    this.#ctx.restore();
    this.#ctx.resetTransform();
    if(this.onUI) this.onUI(dt, this.#ui);
    debug.ui(dt, this.#ui);

    if(this.onTick) this.onTick(dt);
    debug.tick(dt);

    this.camera.tick(dt);
    input.tick();
    window.requestAnimationFrame(this.#loop.bind(this));
    this.#then = now;
  }
  
  conformToParent() {
    let h = this.#canvas.parentElement.clientHeight - 30;
    let w = h * 1.77777;
    const ww = window.innerWidth;
    const left = this.#canvas.offsetLeft;
    if(w > window.innerWidth - (left * 2) + 2) {
      w = this.#canvas.parentElement.clientWidth;
      h = w * 0.5625;
    }
    // TODO: this will not work if w < h
    this.setSize(w, h); // 16:9 ratio
  }

  setSize(width, height) {
    this.#w = width || this.#w;
    this.#h = height || this.#h;
    this.#canvas.width = this.#w;
    this.#canvas.height = this.#h;
  }
}