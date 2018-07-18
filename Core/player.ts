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

import { Socket } from "../node_modules/@types/socket.io";
import { NameColorPair } from "./utils";
//set this to what the admin password should be
const password = "goat";

interface PlayerData {
    [key: string]: any;
}

export class Player {
    //true if the player has a username
    private _registered: boolean = false;
    private readonly _socket: Socket;
    private _inGame: boolean = false;
    private _username: string = "randomuser";
    //object that can be used to flexibly add data to player for game purposes
    public data: PlayerData = {};
    //index of the game the player is in in the server's 'games' array
    private _game: number = -1;
    //true if the player has disconnected entirely
    private _disconnected: boolean = false;
    private _admin: boolean = false;
    private _startVote: boolean = false;
    //username color
    private _color: string = "";
    private _gameClickedLast: number = -1;
    private _session: string = "";
    //true if already playing in another tab
    private _cannotRegister: boolean = false;

    public constructor(socket: Socket, session: string) {
        this._socket = socket;
        this._username = "randomuser";
        this._session = session;
    }
    public resetAfterGame(): void {
        this._inGame = false;
        this.data = {};
        this._game = -1;
        this._startVote = false;
        this._color = "";
        this._gameClickedLast = -1;
    }
    public banFromRegistering(): void {
        this._cannotRegister = true;
    }
    get cannotRegister() {
        return this._cannotRegister;
    }
    set gameClickedLast(game: number) {
        this._gameClickedLast = game;
    }
    get gameClickedLast() {
        return this._gameClickedLast;
    }
    /**
     * Causes the client to emit a notification sound 
     */
    public sound(sound: string) {
        this._socket.emit("sound", sound);
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
    get game() {
        return this._game;
    }
    get id() {
        return this._socket.id;
    }
    get inGame() {
        return this._inGame;
    }
    set game(game: number) {
        this._game = game;
    }
    set inGame(isInGame: boolean) {
        this._inGame = isInGame;
    }
    /**
     * Sets html title of client.
     */
    set title(title: string) {
        this._socket.emit('setTitle', title);
    }
    get registered() {
        return this._registered;
    }
    public register() {
        this._socket.emit('registered');
        this._registered = true;
    }
    public setUsername(username: string) {
        this._username = username;
    }
    get username() {
        return this._username;
    }
    public updateGameListing(name: string, playerNameColorPairs: Array<NameColorPair>, number: number, inPlay: boolean) {
        let playerNames: Array<string> = [];
        let playerColors: Array<string> = [];
        for (let i = 0; i < playerNameColorPairs.length; i++) {
            playerColors.push(playerNameColorPairs[i].color);
            playerNames.push(playerNameColorPairs[i].username);
        }
        this.socket.emit("updateGame", name, playerNames, playerColors, number + 1, inPlay);
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
     * Sends event to this player
     * 
     * @param {string} event 
     * @memberof Player
     */
    public emit(event: string) {
        this._socket.emit(event);
    }
    /** 
     * send message to this player and only this player
     * @param msg
     */
    public send(msg: string, textColor?: string, backgroundColor?: string, usernameColor?: string): void {
        this._socket.emit("message", msg, textColor, backgroundColor, usernameColor);
    }

    //These functions manipulate the two boxes either side of the central chatbox
    public rightSend(msg: string, textColor?: string, backgroundColor?: string): void {
        this._socket.emit("rightMessage", msg, textColor, backgroundColor);
    }
    public leftSend(msg: string, textColor?: string, backgroundColor?: string): void {
        this._socket.emit("leftMessage", msg, textColor, backgroundColor)
    }
    public removeRight(msg: string) {
        this._socket.emit("removeRight", msg);
    }
    public removeLeft(msg: string) {
        this._socket.emit("removeLeft", msg);
    }
    public lineThroughPlayer(msg: string, color: string) {
        this._socket.emit("lineThroughPlayer", msg, color);
    }
    public markAsDead(msg: string) {
        this._socket.emit("markAsDead", msg);
    }
    /**
     * Removes another player's username from the lobby
     * E.g the other player has left.
     * @param username 
     * @param game 
     */
    public removePlayerListingFromLobby(username: string, game: number) {
        this._socket.emit("removePlayerFromLobbyList", username, game);
    }
    public addListingToLobby(username: string, color: string, game: number) {
        this._socket.emit("addPlayerToLobbyList", username, color, game);
    }
    public markGameStatusInLobby(game: number, status: string) {
        this._socket.emit("markGameStatusInLobby", game, status);
    }
    public setTime(time: number, warn: number) {
        this._socket.emit("setTime", time, warn);
    }
    get socket() {
        return this._socket;
    }
    get startVote() {
        return this._startVote;
    }
    set startVote(startVote: boolean) {
        this._startVote = startVote;
    }
    set color(color: string) {
        this._color = color;
    }
    get color() {
        return this._color;
    }
    public equals(otherPlayer: Player): boolean {
        return this.id == otherPlayer.id;
    }
    public registrationError(message: string) {
        this._socket.emit('registrationError', message)
    }
}
