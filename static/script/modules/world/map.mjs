import { randRange } from "../math/mod.mjs";
import Rect from "../math/rect.mjs";
import Vector from "../math/vector.mjs";
import Chunk from "./chunk.mjs";

export const CHUNK_SIZE = 20;
export const CHUNK_AREA = CHUNK_SIZE*CHUNK_SIZE;

export const TILE_SIZE = 32;
export const CHUNK_WORLD_SIZE = CHUNK_SIZE * TILE_SIZE;

/**
 * Convert from world-space to tile-space
 * @param {Vector} pos
 * @returns {Vector}
 */
export const worldToTile = (pos) => {
  return new Vector(Math.floor(pos.x/TILE_SIZE), Math.floor(pos.y/TILE_SIZE));
}
/**
 * Convert from tile-space to chunk-space
 * @param {Vector} pos
 * @returns {Vector}
 */
export const tileToChunk = (pos) => {
  return new Vector(Math.floor(pos.x/CHUNK_SIZE), Math.floor(pos.y/CHUNK_SIZE));
}

export const tileToWorld = (pos, chunk=null) => {
  if(chunk) return new Vector((pos.x + chunk.x*CHUNK_SIZE)*TILE_SIZE,
                              (pos.y + chunk.y*CHUNK_SIZE)*TILE_SIZE);
  return new Vector(pos.x*TILE_SIZE, pos.y*TILE_SIZE);
}
/**
 * Convert from world-space to chunk-space
 * @param {Vector} pos
 * @returns {Vector}
 */
export const worldToChunk = (pos) => {
  return tileToChunk(worldToTile(pos));
}

/**
 * @typedef DetailedTile
 * @type {object}
 * @prop {Tile} tile the tile
 * @prop {Chunk} chunk chunk the tile is from
 * @prop {number} x tile-space x relative to chunk
 * @prop {number} y tile-space y relative to chunk
 * @prop {number} worldX tile-space x relative to origin
 * @prop {number} worldY tile-space y relative to origin
 */

/** 
 * @typedef Tile
 * @type {number}
 */

/**
 * Enum for Tile types.
 * @readonly
 * @enum {number}
 */
 export const TILES = {
  VOID: 0,
  FLOOR: 1,
  WALL: 2,
  DAMAGED_FLOOR: 3,
  DAMAGED_WALL: 4,
}

export const IS_SOLID = [
  false, false, true, false, true,
];

/**
 * Enum for Tile colors.
 * @readonly
 * @enum {string}
 */
export const TILE_COLORS = [
  "black",
  "darkgray",
  "blue",
  "red",
];

export default class Map {
  /** @type {{[y: number]: {[x: number]: Chunk}}} */
  #chunks = {}

  constructor() {
    this.#chunks[0] = {};
    this.#chunks[0][0] = new Chunk(0,0);
  }

  renderChunk(pos, dt, ctx) {
    if(this.#chunks[pos.y] == undefined) return;
    const c = this.#chunks[pos.y][pos.x];
    if(!c) return;
    c.render(dt, ctx);
  }

  cleanChunks() {
    for(const obj of Object.values(this.#chunks)) {
      for(const c of Object.values(obj)) {
        c.dirty = false;
      }
    }
  }

  /**
   * 
   * @param {Chunk} a 
   * @param {Chunk} b 
   */
  #glueEdge(a, b, v) {
    if(!a || !b) return false;

    while(true) {
      const i = randRange(1, CHUNK_SIZE-1);
      const x = i * v;
      const y = i * !v;
      if(b.getTile(CHUNK_SIZE - (x+1),CHUNK_SIZE - (y+1)) == TILES.FLOOR &&
         a.getTile(x + !v, y + v) == TILES.FLOOR) {
        a.setTile(x,y, TILES.FLOOR);
        return true;
      }
    }
  }

  /**
   * 
   * @param {Vector} pos 
   * @returns 
   */
  createChunk(pos) {
    if(this.#chunks[pos.y] == undefined) this.#chunks[pos.y] = {};
    if(this.#chunks[pos.y][pos.x] != undefined) {
      const c = this.#chunks[pos.y][pos.x];
      if(!c.doored[1])
        c.doored[1] = this.#glueEdge(c, this.getChunk(Vector.sub(pos, Vector.up)), true);
      if(!c.doored[0])
        c.doored[0] =  this.#glueEdge(c, this.getChunk(Vector.add(pos, Vector.left)), false);
      return false;
    }
    const c = new Chunk(pos.x, pos.y);
    this.#chunks[pos.y][pos.x] = c;
    return true;
  }

  /**
   * 
   * @param {Vector} pos
   * @returns {Chunk}
   */
  getChunk(pos) {
    if(!this.#chunks[pos.y]) return;
    return this.#chunks[pos.y][pos.x];
  }
  /**
   * 
   * @param {Vector} pos
   * @returns {Chunk}
   */
  getChunkFromWorld(pos) {
    return this.getChunk(worldToChunk(pos));
  }

  probeTile(pos) {
    const c = this.getChunk(tileToChunk(pos));
    if(!c) return {tile: null, chunk: null, x: null, y: null, worldX: null, worldY: null};
    const x = pos.x - c.x * CHUNK_SIZE;
    const y = pos.y - c.y * CHUNK_SIZE;
    return {
      tile: c.getTile(x, y),
      chunk: c,
      x, y, worldX: pos.x, worldY: pos.y
    }
  }
/**
   * 
   * @param {Vector} pos 
   * @returns {Tile}
   */
  getTile(pos) {
    return this.probeTile(pos).tile;
  }

  getTileRect(pos) {
    return new Rect(Math.floor(pos.x / TILE_SIZE)*TILE_SIZE,Math.floor(pos.y / TILE_SIZE)*TILE_SIZE, TILE_SIZE, TILE_SIZE);
  }

  /**
   * 
   * @param {Vector} pos 
   * @param {Tile} tile 
   */
  setTile(pos, tile) {
    const c = this.getChunk(tileToChunk(pos));
    if(!c) return;
    c.setTile(pos.x-c.x*CHUNK_SIZE, pos.y-c.y*CHUNK_SIZE, tile);
  }

  /**
   * 
   * @param {Rect} rect 
   */
  tileCollides(rect) {
    const left = Math.floor(rect.left / TILE_SIZE);
    const right = Math.floor(rect.right / TILE_SIZE);
    const top = Math.floor(rect.top / TILE_SIZE);
    const bottom = Math.floor(rect.bottom / TILE_SIZE);
    for(let x = left; x<=right; x++) {
      for(let y = top; y <= bottom; y++) {
        const v = new Vector(x,y);
        // console.log(v.toString(),this.getTile(v));
        if(IS_SOLID[this.getTile(v)]) {
          return v.mul(1/TILE_SIZE);
        }
        
      }
    }
    return null;
  }

  // raycast algorithm taken and modified from https://theshoemaker.de/2016/02/ray-casting-in-2d-grids/
  /**
   * 
   * @param {Vector} pos 
   * @param {number} dir 
   */
  #rayHelpers(pos, dir) {
    const tile = Math.floor(pos / TILE_SIZE) + 1;
    let dTile, dt;
    if (dir > 0) {
      dTile = 1;
      dt = (tile*TILE_SIZE - pos) / dir;
    } else {
      dTile = -1;
      dt = ((tile-1)*TILE_SIZE - pos) / dir;
    }
    return [tile, dTile, dt, dTile * TILE_SIZE/dir];
  }

  /**
   * 
   * @param {Vector} start 
   * @param {Vector} end
   * @param {number} maxPoints 
   */
  raycast(start, end, maxPoints = Infinity) {
    const dir = Vector.sub(end, start);
    const length = dir.magnitude;
    dir.div(length);

    let [tileX, dTileX, dtX, ddtX] = this.#rayHelpers(start.x, dir.x);
    let [tileY, dTileY, dtY, ddtY] = this.#rayHelpers(start.y, dir.y);
    let t = 0;
    const out = [];
    const epsilon = 2;
    if (dir.sqrMagnitude <= 0) return [];
    let scaryCounter = 0;
    while(true) { //tileX > 0 && tileX <= CHUNK_SIZE && tileY > 0 && tileY <= CHUNK_SIZE
      scaryCounter += 1;
      if(scaryCounter >= 10000) {
        console.error('raycast went too long!')
        break;
      }
      if(out.length >= maxPoints) break;
      if(t >= length) break;

      // TODO: fix raycast point flickering
      // this is a hack fix
      const point = new Vector(start.x + dir.x*t, start.y + dir.y*t);
      const testA = this.getTile(worldToTile(point));
      const testB = this.getTile(worldToTile(Vector.sub(point, new Vector(epsilon, 0))));
      const testC = this.getTile(worldToTile(Vector.sub(point, new Vector(0, epsilon))));
      if(IS_SOLID[testA] || IS_SOLID[testB] || IS_SOLID[testC]) {
        out.push(point);
      }

      if (dtX < dtY) {
        tileX += dTileX;
        const dt = dtX;
        t += dt;
        dtX += ddtX - dt;
        dtY -= dt;
      } else {
        tileY += dTileY;
        const dt = dtY;
        t += dt;
        dtX -= dt;
        dtY += ddtY - dt;
      }
    }
    return out;
  }
}