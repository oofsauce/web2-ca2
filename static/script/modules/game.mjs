'use strict';
import { FONTS, PHYSICS_INTER } from "./constants.mjs";
import Player, { PLAYER_SIZE, PLAYER_SIZE_HALF } from "./player/player.mjs";
import Renderer from "./renderer.mjs";

import * as input from './input/mod.mjs';
import * as bullets from './weapons/bullets.mjs';
import * as collisionDebug from './debug/collision.mjs';

import World from "./world.mjs";
import * as pathfinding from "./ai/pathfinding/pathfinding.mjs";
import Vector from "./math/vector.mjs";
import UI from './ui/ui.mjs';
import Rect from "./math/rect.mjs";
import { setFlag, getFlag, registerDebug, Flags, physics as debugPhysics } from "./ui/debug.mjs";
import { Align } from "./ui/positioningContext.mjs";

import Entity from "./entity.mjs";
import Dummy from "./ai/enemy/dummy.mjs";
import Enemy from "./ai/enemy/enemy.mjs";
import { CHUNK_SIZE, TILE_SIZE, worldToChunk } from "./world/map.mjs";

export default class Game {
  #loaded = false;
  /** @type {Renderer} */
  #renderer;
  /** @type {World} */
  #world;


  get loaded() {
    return this.#loaded;
  }

  constructor(renderer) {
    this.#renderer = renderer;
    
    this.#world = new World(this.#renderer.camera);

    this.#renderer.camera.position = this.#world.player.position;

    pathfinding.debug.state.world = this.#world;
    pathfinding.debug.state.renderer = this.#renderer;

    this.#renderer.listen(
      (dt, ctx) => {this.draw(dt, ctx)},
      (dt, ui) => {this.ui(dt, ui)},
      (dt) => {this.tick(dt)},
      (dt) => {this.physics(dt)},
    )
  }
  /** @type {HTMLAudioElement} */
  #audio;
  async load() {
    if(this.#loaded) return;
    console.debug("Loading game...");

    this.#audio = new Audio(URL_BASE + "/static/sound/machine-gun.mp3");
    this.#audio.loop = true;
    await new Promise((resolve, reject) => {
      this.#audio.addEventListener("canplaythrough", e => {
        resolve();
      });
    })

    this.#loaded = true;
    registerDebug(Flags.PATHFINDING, "draw", pathfinding.debug.draw);
    registerDebug(Flags.PATHFINDING, "tick", pathfinding.debug.tick);
    registerDebug(Flags.COLLISION, "draw", collisionDebug.draw);
    registerDebug(Flags.COLLISION, "tick", collisionDebug.tick);
    registerDebug(Flags.COLLISION, "physics", collisionDebug.physics);

    bullets.registerBulletType("pistol", {
      type: bullets.ProjectileType.PHYSICS,
      params: {
        drag: 1,
        restitution: 0,
        size: new Vector(2, 5),
        trailColor: "yellow",
        trailLength: 10,
      }
    })
  }

  start() {
    console.log('Starting game...');
    // this.#world.addEntity(new Dummy(new Vector(TILE_SIZE*5.5,TILE_SIZE*5.5)));
    // this.#world.addEntity(new Enemy(new Vector(TILE_SIZE*6.5,TILE_SIZE*6.5)));
    console.log('Game started!');
  }

  destroy() {
    if(!this.#loaded) return; // no need to unload anything if not loaded
    console.debug("Destroying game...");
  }

  ////// ACTUAL GAME STUFF

  #debug = true; // FIXME: make this false by default before prod
  /**
   * 
   * @param {number} dt Deltatime in seconds
   * @param {UI} ui UI Object
   */
  ui(dt, ui) {
    // debugMenu(dt, ui);

    if(this.#debug) {
      ui.font.color = "white";
      ui.font.family = FONTS.MONO;
      ui.startArea(new Rect(0,0, ui.ctx.canvas.width/3, ui.ctx.canvas.height), Align.START);
      ui.startVertical();
      ui.text(`frametime: ${(dt*1000).toFixed(3).padStart(6)}ms`);

      ui.space();

      ui.text(`pos: ${this.#world.player.position.toString(3)}`);
      ui.text('vel: ' + this.#world.player.velocity.toString(3));

      ui.space();

      ui.text('DEBUG FLAGS');
      setFlag(Flags.PATHFINDING, ui.checkbox(getFlag(Flags.PATHFINDING), "pathfinding visualisation"));
      setFlag(Flags.PLAYER, ui.checkbox(getFlag(Flags.PLAYER), "player debug"));
      setFlag(Flags.UI, ui.checkbox(getFlag(Flags.UI), "ui debug"));
      setFlag(Flags.AI, ui.checkbox(getFlag(Flags.AI), "ai debug"));
      setFlag(Flags.COLLISION, ui.checkbox(getFlag(Flags.COLLISION), "collision debug"));

      ui.space();
      
      ui.hidden = !getFlag(Flags.PATHFINDING);
      ui.text('PATHFINDING VIS:');
      ui.text('Left click to place point A.');
      ui.text('Right click to place point B.');
      ui.hidden = false;
      
      ui.endVertical();
      ui.endArea();
    }
  }

  
  /** @type {import("./world/map.mjs").DetailedTile} */
  #a;
  /** @type {import("./world/map.mjs").DetailedTile} */
  #b;
  #path;
  /**
  * Render a frame.
  * @param {number} dt
  * @param {CanvasRenderingContext2D} ctx 
  */
  draw(dt, ctx) {
    if(this.#topLeft) {
      for(let x = this.#topLeft.x; x <= this.#bottomRight.x; x++) {
        for(let y = this.#topLeft.y; y <= this.#bottomRight.y; y++) {
          this.#world.map.renderChunk(new Vector(x,y), dt, ctx);
        }
      }
    }
    this.#world.render(dt, ctx);

    bullets.draw(dt, ctx);

    ctx.fillStyle = "red";
    ctx.fillRect(this.#crosshair.x-2.5, this.#crosshair.y-2.5, 5, 5);

  }

  /** @type {Vector} */
  #crosshair = Vector.zero;

  #gunTime = 0;
  #gunInterval = 0.105;


  #topLeft;
  #bottomRight;

  /**
   * Do a tick.
   */
  tick(dt) {
    this.#world.tick(dt);
    if(input.buttonDown("debug")) {
      this.#debug ^= true;
    }

    if(input.leftMouseDown()) this.#audio.play();
    if(input.leftMouseUp()) {this.#audio.pause();this.#audio.currentTime = 0;}

    if(input.leftMouse()) {
      this.#gunTime += dt;
      if(this.#gunTime > this.#gunInterval) {
        bullets.createBullet("pistol", {
          pos: this.#world.player.position.clone(),
          vel: Vector.sub(Vector.random().mul(TILE_SIZE*.4).add(this.#crosshair), this.#world.player.position).normalized().mul(600),
          damage: 10,
          life: 5,
        })
        this.#gunTime = 0;
      }
    }

    this.#crosshair = this.#renderer.camera.screenToWorld(input.mouse());
    this.#renderer.camera.position = Vector.lerp(this.#world.player.position, this.#crosshair, 0.3);

    this.#topLeft = worldToChunk(this.#renderer.camera.viewportToWorld(Vector.zero));
    this.#bottomRight = worldToChunk(this.#renderer.camera.viewportToWorld(Vector.one));
    // console.debug(topLeft.toString(), bottomRight.toString())
    let count = 0;
    for(let x = this.#topLeft.x; x <= this.#bottomRight.x; x++) {
      for(let y = this.#topLeft.y-1; y <= this.#bottomRight.y; y++) {
        this.#world.map.createChunk(new Vector(x,y));
        count++;
      }
    }

    // this.#renderer.camera.position = this.#player.position;
  }
  /**
   * Do a fixed rate physics tick.
   * @param {number} dt
   */
  physics(dt) {
    this.#world.physics(dt);
    debugPhysics(dt, this.#world);
  }
}