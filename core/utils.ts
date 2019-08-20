/*
  Copyright 2017-2018 James V. Craster
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
      http://www.apache.org/licenses/LICENSE-2.0
  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License. 
*/

"use strict";

export class Stopwatch {
  private _time: number = Date.now();
  private _storedElapsed: number = 0;
  private _running: boolean = false;
  /**
   * Restarts the timer, but does not affect whether it is running or not.
   * If the timer is stopped, it will remain so after restart is called.
   */
  public restart(): void {
    this._storedElapsed = 0;
    this._time = Date.now();
  }
  get time(): number {
    if (this._running) {
      return Date.now() - this._time + this._storedElapsed;
    } else {
      return this._storedElapsed;
    }
  }
  public stop(): number {
    if (this._running) {
      this._storedElapsed += Date.now() - this._time;
      this._time = Date.now();
      this._running = false;
    }
    return this.time;
  }
  public start(): number {
    if (!this._running) {
      this._time = Date.now();
      this._running = true;
    }
    return this.time;
  }
}

export namespace Utils {
  /**
   * Shuffles an array
   * @returns {Array<T>} An array of the same elements in random order
   */
  export function shuffle<T>(deck: Array<T>): Array<T> {
    let randomDeck = [];
    let hat = deck.slice();
    while (hat.length !== 0) {
      let rIndex = Math.floor(hat.length * Math.random());
      randomDeck.push(hat[rIndex]);
      hat.splice(rIndex, 1);
    }
    return randomDeck;
  }
  /**
   * Returns true if the first word of message is the command, false otherwise
   */
  export function isCommand(msg: string, command: string): boolean {
    return msg.slice(0, command.length) === command;
  }
  /**
   * Returns list of arguments in command in order
   */
  export function commandArguments(msg: string): Array<string> {
    let args = msg.split(" ");
    //remove first word (which is the command itself)
    args.splice(0, 1);
    return args;
  }
  /**
   * Returns a random set of elements of size r from listIn, without repetition.
   */
  export function chooseCombination<T>(listIn: Array<T>, r: number): Array<T> {
    let list = listIn.slice();
    let combination: Array<T> = [];
    if (list.length < r) {
      return combination;
    } else {
      while (combination.length < r) {
        let randomvar = Math.floor(Math.random() * list.length);
        combination.push(list[randomvar]);
        list.splice(randomvar, 1);
      }
      return combination;
    }
  }
}

/**
 * All the colors used in games. No color should be used if it is not in this enum,
 * for consistency.
 */
export enum Colors {
  none = "",
  red = "#950d0d",
  brightRed = "#ff1b1b",
  green = "#017501",
  brightGreen = "#03b603",
  yellow = "#756f00",
  brightYellow = "#ffff00",
  magenta = "#c400ff",
  lightBlue = "#00ffff",
  orange = "#ffa500",
  usernameGreen = "#4bff00",
  usernameRed = "#ff0000",
  darkBlue = "#007eff",
  pink = "#ff3f9f",
  seaGreen = "#20b2aa",
  white = "#ffffff",
  standardWhite = "#cecece",
  brown = "#a5542a",
  darkGreen = "#2aa54c",
  nightBlue = "#1919cc",
  grey = "#808080",
}

//For convenience with Pug, usernames/colors are grouped together.
export interface NameColorPair {
  username: string;
  color: string;
}

export const UserColorArray: Array<Colors> = [
  Colors.magenta,
  Colors.lightBlue,
  Colors.brightYellow,
  Colors.orange,
  Colors.darkGreen,
  Colors.usernameGreen,
  Colors.darkBlue,
  Colors.pink,
  Colors.brown,
];
