'use strict';
import { COMBO_COOLDOWN, FONTS, GAME_TIMER, KILL_SCORE, MAX_COMBO, PHYSICS_INTER } from "./constants.mjs";
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
import { CHUNK_SIZE, CHUNK_WORLD_SIZE, TILES, TILE_SIZE, worldToChunk, worldToTile } from "./world/map.mjs";
import Chunk from "./world/chunk.mjs";
import {lerp } from "./math/mod.mjs";
import { drawScoreboard } from "./scoreboard/ui.mjs";
import {requestToken} from "./scoreboard/api.mjs";
import { loadImage } from "./images.mjs";
import * as explosions from "./weapons/explosion.mjs";
import { initSounds, Sounds, triggerSound } from "./audio/Sound.mjs";
import { startAudio } from "./audio.mjs";
import { debugUI } from "./debug/game.mjs";

export default class Game {
  #loaded = false;
  /** @type {Renderer} */
  #renderer;
  /** @type {World} */
  #world;

  #score = 0;
  #combo = 0;
  #comboTimer = 0;
  #timer = 0;

  #playing = false;

  #time = 0;

  #grenades = 3;
  #killCount = 0;


  get loaded() {
    return this.#loaded;
  }

  constructor(renderer) {
    this.#renderer = renderer;
    
    this.#world = new World(this.#renderer.camera);

    this.#world.onKill = (e) => {
      this.#comboTimer = COMBO_COOLDOWN;
      this.#combo = Math.min(MAX_COMBO, this.#combo + 1);
      this.#score += KILL_SCORE * this.#combo;
      this.#killCount++;
      if(this.#killCount >= 2) {
        this.#grenades += 1;
        this.#killCount = 0;
        triggerSound(Sounds.PICKUP_B);
      }
    }

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
  async load() {
    if(this.#loaded) return;
    console.debug("Loading game...");

    await Promise.allSettled([
      loadImage('head.png'),
      loadImage('body.png'),
      loadImage('enemy.png'),
      loadImage('tiles.png'),
      loadImage('explosion.png'),
    ]);

    startAudio();
    await initSounds();

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
        size: new Vector(2, 2),
        trailColor: "yellow",
        trailLength: 10,
      }
    });

    bullets.registerBulletType("grenade", {
      type: bullets.ProjectileType.PHYSICS,
      params: {
        drag: 0.6,
        restitution: 0.9,
        size: new Vector(8,8),
      },
      /**
       * 
       * @param {import("./weapons/bullets.mjs").Bullet} b 
       */
      onDeath: (b) => {
        explosions.explode(b.pos, 1, this.#world);
        triggerSound(Sounds.EXPLOSION);
      }
    })
  }

  start() {
    console.log('Starting game...');
    this.#playing = true;
    this.#timer = GAME_TIMER;
    
    requestToken();
    // this.#world.addEntity(new Dummy(new Vector(TILE_SIZE*5.5,TILE_SIZE*5.5)));
    // this.#world.addEntity(new Enemy(new Vector(TILE_SIZE*6.5,TILE_SIZE*6.5)));
    console.log('Game started!');
  }

  destroy() {
    if(!this.#loaded) return; // no need to unload anything if not loaded
    console.debug("Destroying game...");
  }

  ////// ACTUAL GAME STUFF

  #debug = false; // FIXME: make this false by default before prod
  #comboSize = 12;
  /**
   * 
   * @param {number} dt Deltatime in seconds
   * @param {UI} ui UI Object
   */
  ui(dt, ui) {
    this.#time += dt;
    // debugMenu(dt, ui);

    if(this.#debug) {
      debugUI(dt, ui, this.#world);
    }
    if(this.#playing) {
      ui.font.family = FONTS.SANS;
      ui.textPadding.top = 2;
      ui.textPadding.bottom = 0;
      ui.hidden = false;
      ui.startArea(new Rect(0,0,ui.ctx.canvas.width, ui.ctx.canvas.height), Align.CENTER);
      ui.startVertical();
      ui.font.size = 50;
      ui.text(this.#timer.toFixed(2));
      ui.font.size = 30;
      ui.text(this.#score);

      
      const w = 200 * (this.#comboTimer/COMBO_COOLDOWN);
      ui.ctx.fillStyle = "white";
      ui.ctx.fillRect(ui.ctx.canvas.width/2-w/2, 110, w, 7);

      if(this.#combo > 0) {
        this.#comboSize = lerp(this.#comboSize, 20 + (this.#combo/MAX_COMBO) * (40-20), 0.1);
        ui.font.size = this.#comboSize;
        ui.text('x' + this.#combo);
      } else {
        this.#comboSize = 0;
      }
      ui.font.size = 12;
      ui.endVertical();
      ui.endArea();

      ui.startArea(new Rect(0, ui.ctx.canvas.height - 80, ui.ctx.canvas.width, ui.ctx.canvas.height), Align.CENTER);
      ui.startVertical();
      ui.font.size = 30;
      ui.text(this.#grenades);
      ui.font.size = 20;
      ui.text("GRENADES");
      ui.font.size = 12;
      ui.endVertical();
      ui.endArea();
    } else {
      ui.ctx.fillStyle = "rgba(0,0,0,0.5)";
      ui.ctx.fillRect(0,0, ui.ctx.canvas.width, ui.ctx.canvas.height);
      ui.startArea(new Rect(0,0,ui.ctx.canvas.width, ui.ctx.canvas.height), Align.CENTER);
      ui.startVertical();
      ui.font.size = 50;
      ui.space();
      ui.text("GAME OVER");
      ui.font.size = 30;
      ui.text(`You got ${this.#score} points.`)
      drawScoreboard(dt, ui, this.#score);
      ui.endVertical();
      ui.endArea();
      ui.font.size = 12;
    }

      ui.textPadding.top = 5;
      ui.textPadding.bottom = 5;
      ui.startArea(new Rect(5,ui.ctx.canvas.height-25, ui.ctx.canvas.width/3, ui.ctx.canvas.height), Align.START, Align.END);
      if(!document.fullscreenElement) {
        if(ui.button("Fullscreen")) {
          ui.ctx.canvas.requestFullscreen();
        }
      } else {
        ui.hidden = true;
        ui.button("", 5); // extremely dirty hack to fix chrome-specific mouse eating bug
        ui.hidden = false;
      }
      ui.textPadding.top = 2;
      ui.textPadding.bottom = 2;
      ui.endArea();
  }

  
  /** @type {import("./world/map.mjs").DetailedTile} */
  #a;
  /** @type {import("./world/map.mjs").DetailedTile} */
  #b;
  #path;
  #laserHit = [];
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

    if(this.#laserHit && this.#playing) {
      ctx.strokeStyle = "rgba(255,0,0,0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.#world.player.virtualPosition.x, this.#world.player.virtualPosition.y);
      ctx.lineTo(this.#laserHit.x, this.#laserHit.y);
      ctx.stroke();

      ctx.fillStyle = "red";
      ctx.fillRect(this.#laserHit.x-2.5, this.#laserHit.y-2.5, 5, 5);
    }
    this.#world.render(dt, ctx);
    explosions.render(dt, ctx);


    if(this.#world.player.dead) {
      this.#playing = false;
    }
    if(this.#playing)
      this.#timer -= dt;
    if(this.#timer <= 0) {
      this.#timer = 0;
      this.#playing = false;
    }
    if(this.#comboTimer > 0)
      this.#comboTimer -= dt;
    if(this.#comboTimer < 0) {
      this.#combo = 0;
      this.#comboTimer = 0;
    }
  }

  /** @type {Vector} */
  #crosshair = Vector.zero;

  #gunTime = 0;
  #gunInterval = 0.105;


  #topLeft;
  #bottomRight;

  /**
   * 
   * @param {Chunk} chunk 
   */
  #safeSpot(chunk) {
    while(true) {
      const p = new Vector(Math.floor(Math.random() * CHUNK_SIZE),Math.floor(Math.random() * CHUNK_SIZE));
      if(chunk.getTile(p.x, p.y) == TILES.FLOOR) return p.add(new Vector(0.5, 0.5).add(new Vector(chunk.x, chunk.y).mul(CHUNK_SIZE))).mul(TILE_SIZE).clone();
    }
  }
  /**
   * 
   * @param {Chunk} chunk 
   */
  #populateChunk(chunk) {
    if(chunk.populated) return;
    for(let i = 0; i < 3; i++) {
      this.#world.addEntity(new Enemy(this.#safeSpot(chunk)));
    }
    chunk.populated = true;
  }

  /**
   * Do a tick.
   */
  tick(dt) {
    if(input.buttonDown("debug")) {
      this.#debug ^= true;
    }

    if(!this.#playing) return;
    

    this.#world.tick(dt);

    if(input.leftMouse()) {
      this.#gunTime += dt;
      if(this.#gunTime > this.#gunInterval) {
        const d = Vector.sub(this.#crosshair, this.#world.player.position).normalized();
        bullets.createBullet("pistol", {
          pos: this.#world.player.position.clone().add(d.clone().mul(16)),
          vel: d.mul(600).add(Vector.random().mul(TILE_SIZE*1.5)),
          damage: 10,
          life: 5,
        })
        this.#gunTime = 0;
        triggerSound(Sounds.SHOOT);
      }
    }

    if(input.rightMouseDown() && this.#grenades > 0) {
      this.#grenades -= 1;
      const d = Vector.sub(this.#crosshair, this.#world.player.position).normalized();
      bullets.createBullet("grenade", {
        pos: this.#world.player.position.clone().add(d.clone().mul(16)),
        vel: d.mul(700).add(Vector.random().mul(TILE_SIZE*1.5)),
        damage: 1,
        life: 1,
      })
    }

    this.#crosshair = this.#renderer.camera.screenToWorld(input.mouse());
    this.#renderer.camera.position = Vector.lerp(this.#world.player.position, this.#crosshair, 0.3);

    const target = Vector.add(this.#world.player.position, Vector.sub(this.#crosshair, this.#world.player.position).mul(100));
    this.#laserHit = this.#world.map.raycast(this.#world.player.position, target, 1)[0];
    if(!this.#laserHit)
      this.#laserHit = target;

    this.#topLeft = worldToChunk(this.#renderer.camera.viewportToWorld(Vector.zero));
    this.#bottomRight = worldToChunk(this.#renderer.camera.viewportToWorld(Vector.one));
    // console.debug(topLeft.toString(), bottomRight.toString())
    let count = 0;
    for(let x = this.#topLeft.x-1; x <= this.#bottomRight.x+1; x++) {
      for(let y = this.#topLeft.y-2; y <= this.#bottomRight.y+1; y++) {
        if (this.#world.map.createChunk(new Vector(x,y))) {
          this.#populateChunk(this.#world.map.getChunk(new Vector(x,y)));
        };
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
    this.#world.map.cleanChunks();
    this.#world.physics(dt);
    debugPhysics(dt, this.#world);
  }
}