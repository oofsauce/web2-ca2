'use strict';
export {button, buttonDown, buttonUp, rawFromQueue} from "./keyboard.mjs";
export {
  setMouseEat, isMouseEaten,
  mouse,
  leftMouse, rightMouse,
  leftMouseDown, leftMouseUp,
  rightMouseDown, rightMouseUp
} from "./mouse.mjs";

import {button, tick as keyTick, init as keyInit} from './keyboard.mjs';
import {tick as mouseTick, init as mouseInit} from './mouse.mjs';



/**
 * Definition of virtual button inputs and their mapped keys
 * @type {{[button: string]: Button}}
 */
export const buttons = {
  "up": {state: 0, keys: ["w"]},
  "left": {state: 0, keys: ["a"]},
  "down": {state: 0, keys: ["s"]},
  "right": {state: 0, keys: ["d"]},
  "debug": {state: 0, keys: ["`"]},
  "space": {state: 0, keys: [" "]}, // this ones more just to stop scrolling
}

const axes = {
  "vertical": ["up", "down"],
  "horizontal": ["right", "left"],
}

/**
 * 
 * @param {HTMLElement} el 
 */
export const init = (el) => {
 keyInit(el);
 mouseInit(el);
}

export const tick = () => {
  keyTick();
  mouseTick();
}

/**
 * 
 * @param {string} axis Name of input axis
 * @returns {number} Value of input axis
 */
export const axis = (axis) => {
  if(!axes[axis]) return console.error("Invalid input axis", axis);
  return button(axes[axis][0]) - button(axes[axis][1]);
}