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

import { Socket } from "socket.io";
import { NameColorPair, Stopwatch, Colors } from "./utils";
import { Game } from "./game";
//set this to what the admin password should be
const password = "goat";

export interface Phrase {
  text: string;
  color?: Colors;
  backgroundColor?: Colors;
  italic?: boolean;
}

export type Message = Array<Phrase>;

export class User {
  //true if the user has a username
  private _registered: boolean = false;
  private _sockets: Array<Socket> = [];
  private _inGame: boolean = false;
  private _username: string = "randomuser";
  //index of the game the user is in in the server's 'games' array
  private _game: undefined | Game = undefined;
  //true if the user has disconnected entirely
  private _disconnected: boolean = false;
  private _admin: boolean = false;
  private _startVote: boolean = false;
  //username color
  private _color: Colors = Colors.none;
  private _gameClickedLast: string = "";
  private _session: string = "";
  //true if already playing in another tab
  private _cannotRegister: boolean = false;
  private _id: string;
  private _cache: Array<{ msg: Message; color?: Colors }> = [];
  private _leftMessageCache: Array<Message> = [];
  private _time: number = 0;
  private _stopwatch: Stopwatch;
  private _warn: number = 0;
  private _canVote: boolean = false;
  private _selectedUserName: string = "";
  private _host: boolean = false;
  //store a list of all the dead players so they get removed when the page is reloaded.
  private _deadCache: Array<string> = [];
  public constructor(user: User);
  public constructor(id: string, session: string);
  public constructor(id: string | User, session?: string) {
    if (id instanceof User) {
      Object.assign(this, id);
      this._stopwatch = id._stopwatch;
      this._id = id._id;
    } else {
      this._id = id;
      this._username = "randomuser";
      if (session) {
        this._session = session;
      }
      this._stopwatch = new Stopwatch();
      this._stopwatch.stop();
    }
  }
  public resetAfterGame(): void {
    this._game = undefined;
    this._inGame = false;
    this._startVote = false;
    this._color = Colors.none;
    this.gameClickedLast = "";
    this._cache = [];
    this._leftMessageCache = [];
    this._deadCache = [];
    this._host = false;
  }
  public reloadClient(): void {
    this.emit("reloadClient");
  }
  public banFromRegistering(): void {
    this._cannotRegister = true;
  }
  get cannotRegister() {
    return this._cannotRegister;
  }
  set gameClickedLast(game: string) {
    this._gameClickedLast = game;
  }
  get gameClickedLast() {
    return this._gameClickedLast;
  }
  /**
   * Sends event to this user
   *
   * @param {string} event
   * @memberof User
   */
  public emit(
    event: string,
    ...args: Array<
      | string
      | number
      | string[]
      | boolean
      | undefined
      | Array<{ text: string; color: string | Colors }>
      | Message
      | Array<{ roleName: string; color: Colors }>
    >
  ) {
    for (let i = 0; i < this._sockets.length; i++) {
      this._sockets[i].emit(event, ...args);
    }
  }
  public makeHost(roles: Array<{ roleName: string; color: Colors }>) {
    this._host = true;
    this.emit("makeHost", roles);
  }
  public removeHostPrivileges() {
    this._host = false;
    this.emit("removeHostPrivileges");
  }
  get isHost() {
    return this._host;
  }
  public addSocket(socket: Socket) {
    this._sockets.push(socket);
  }
  public removeSocket(socket: Socket) {
    let index = this._sockets.indexOf(socket);
    if (index != -1) {
      this._sockets.splice(index, 1);
    }
  }
  get socketCount() {
    return this._sockets.length;
  }
  /**
   * Causes the client to emit a notification sound
   */
  public sound(sound: string) {
    this.emit("sound", sound);
  }
  get session() {
    return this._session;
  }
  get disconnected() {
    return this._disconnected;
  }
  public disconnect() {
    this._disconnected = true;
  }
  get game(): undefined | Game {
    return this._game;
  }
  get id() {
    return this._id;
  }
  get inGame() {
    return this._inGame;
  }
  set game(game: undefined | Game) {
    this._game = game;
  }
  set inGame(isInGame: boolean) {
    this._inGame = isInGame;
  }
  /**
   * Sets html title of client.
   */
  set title(title: string) {
    this.emit("setTitle", title);
  }
  get registered() {
    return this._registered;
  }
  public register() {
    this.emit("registered", this.username);
    this._registered = true;
  }
  public setUsername(username: string) {
    this._username = username;
  }
  get username() {
    return this._username;
  }
  public updateGameListing(
    name: string,
    userNameColorPairs: Array<NameColorPair>,
    uid: string,
    inPlay: boolean,
  ) {
    let usernames: Array<string> = [];
    let userColors: Array<string> = [];
    for (let i = 0; i < userNameColorPairs.length; i++) {
      userColors.push(userNameColorPairs[i].color);
      usernames.push(userNameColorPairs[i].username);
    }
    this.emit("updateGame", name, usernames, userColors, uid, inPlay);
  }
  public verifyAsAdmin(msg: string): boolean {
    if (msg == "!" + password) {
      this._admin = true;
      return true;
    } else {
      return false;
    }
  }
  get admin(): boolean {
    return this._admin;
  }
  /**
   * send message to this user and only this user
   * @param msg
   */

  public send(
    text: Message | string,
    textColor?: Colors,
    backgroundColor?: Colors,
    usernameColor?: Colors,
  ) {
    if (typeof text == "string") {
      this.emit(
        "message",
        [
          {
            text: text,
            color: textColor,
            //backgroundColor: backgroundColor,
          },
        ],
        backgroundColor,
      );
      this._cache.push({
        msg: [
          {
            text: text,
            color: textColor,
          },
        ],
        color: backgroundColor,
      });
      if (this._cache.length > 50) {
        this._cache.splice(0, 1);
      }
    } else {
      this.emit("message", text, textColor);
      this._cache.push({ msg: text, color: textColor });
    }
  }
  get cache() {
    return this._cache;
  }
  get leftCache() {
    return this._leftMessageCache;
  }
  //These functions manipulate the two boxes either side of the central chatbox
  public rightSend(
    msg: string | Message,
    textColor?: Colors,
    backgroundColor?: Colors,
  ): void {
    if (typeof msg == "string") {
      this.emit("rightMessage", [
        { text: msg, color: textColor, backgroundColor: backgroundColor },
      ]);
    } else {
      this.emit("rightMessage", msg);
    }
  }
  public leftSend(
    message: string,
    textColor?: Colors,
    backgroundColor?: Colors,
  ): void {
    this.emit("leftMessage", [
      { text: message, color: textColor, backgroundColor: backgroundColor },
    ]);
    this._leftMessageCache.push([
      { text: message, color: textColor, backgroundColor: backgroundColor },
    ]);
  }
  public removeRight(msg: string) {
    this.emit("removeRight", msg);
  }
  public removeLeft(msg: string) {
    this.emit("removeLeft", msg);
  }
  public lineThroughUser(msg: string, color: string) {
    this.emit("lineThroughPlayer", msg, color);
  }
  public markAsDead(msg: string) {
    this.emit("markAsDead", msg);
    this._deadCache.push(msg);
  }
  /**
   * Removes another user's username from the lobby
   * E.g the other user has left.
   * @param username
   * @param game
   */
  public removePlayerListingFromGame(username: string, game: Game) {
    this.emit("removePlayerFromGameList", username, game.uid);
  }
  public addListingToGame(username: string, color: string, game: Game) {
    this.emit("addPlayerToGameList", username, color, game.uid);
  }
  public markGameStatusInLobby(game: Game, status: string) {
    this.emit("markGameStatusInLobby", game.uid, status);
  }
  public addPlayerToLobbyList(username: string) {
    this.emit("addPlayerToLobbyList", username);
  }
  public removePlayerFromLobbyList(username: string) {
    this.emit("removePlayerFromLobbyList", username);
  }
  public get deadCache(): Array<string> {
    return this._deadCache;
  }
  public lobbyMessage(
    msg: string,
    textColor: Colors,
    backgroundColor?: Colors,
  ) {
    this.emit("lobbyMessage", [
      { text: msg, color: textColor, backgroundColor: backgroundColor },
    ]);
  }
  public setTime(time: number, warn: number) {
    this.emit("setTime", time, warn);
    this._time = time;
    this._warn = warn;
    this._stopwatch.restart();
    this._stopwatch.start();
  }
  public getTime() {
    return this._time - this._stopwatch.time;
  }
  public getWarn() {
    return this._warn;
  }
  get startVote() {
    return this._startVote;
  }
  set startVote(startVote: boolean) {
    this._startVote = startVote;
  }
  set color(color: Colors) {
    this._color = color;
  }
  get color() {
    return this._color;
  }
  public equals(otherUser: User): boolean {
    return this.id == otherUser.id;
  }
  public registrationError(message: string) {
    this.emit("registrationError", message);
  }
  public addNewGameToLobby(name: string, type: string, uid: string) {
    this.emit("addNewGameToLobby", name, type, uid);
  }
  public removeGameFromLobby(uid: string) {
    this.emit("removeGameFromLobby", uid);
  }
  public headerSend(message: Message) {
    this.emit("headerTextMessage", message);
  }
  public cancelVoteEffect() {
    this.emit("cancelVoteEffect");
  }
  public selectUser(username: string) {
    this.emit("selectPlayer", username);
    this._selectedUserName = username;
  }
  get selectedUsername() {
    return this._selectedUserName;
  }
  public canVote() {
    this.emit("canVote");
    this._canVote = true;
  }
  public cannotVote() {
    this.emit("cannotVote");
    this._canVote = false;
  }
  get ifCanVote() {
    return this._canVote;
  }
  public hang(usernames: Array<string>) {
    this.emit("hang", usernames);
  }
  public resetGallows() {
    this.emit("resetGallows");
  }
}
