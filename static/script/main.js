import * as spa from './modules/spa.mjs';
import Game from './modules/game.mjs';

import Vector from './modules/math/vector.mjs';
import Renderer from './modules/renderer.mjs';

import * as input from './modules/input/mod.mjs';

const canvas = document.getElementById("canvas");
const renderer = new Renderer(canvas);
input.init(canvas);

spa.initSPA(
  document.querySelector("nav"),
  document.querySelector("main"),
);

/** @type {Game} */
let game;

spa.addEventListener("game", "open", async () => {
  if(game) game.destroy();
  game = new Game(renderer);
  await game.load();
  game.start();
});

spa.addEventListener("game", "close", () => {
  game.destroy();
});
spa.goto('game').then(() => {
  renderer.conformToParent();
})