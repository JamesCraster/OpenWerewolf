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
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
//set this to what the admin password should be
const password = "goat";
class User {
    constructor(id, session) {
        //true if the user has a username
        this._registered = false;
        this._sockets = [];
        this._inGame = false;
        this._username = "randomuser";
        //index of the game the user is in in the server's 'games' array
        this._game = undefined;
        //true if the user has disconnected entirely
        this._disconnected = false;
        this._admin = false;
        this._startVote = false;
        //username color
        this._color = utils_1.Color.none;
        this._gameClickedLast = "";
        this._session = "";
        //true if already playing in another tab
        this._cannotRegister = false;
        this._cache = [];
        this._leftMessageCache = [];
        this._time = 0;
        this._warn = 0;
        this._canVote = false;
        this._selectedUserName = "";
        //store a list of all the dead players so they get removed when the page is reloaded.
        this._deadCache = [];
        if (id instanceof User) {
            Object.assign(this, id);
            this._stopwatch = id._stopwatch;
            this._id = id._id;
        }
        else {
            this._id = id;
            this._username = "randomuser";
            if (session) {
                this._session = session;
            }
            this._stopwatch = new utils_1.Stopwatch();
            this._stopwatch.stop();
        }
    }
    resetAfterGame() {
        this._game = undefined;
        this._inGame = false;
        this._startVote = false;
        this._color = utils_1.Color.none;
        this.gameClickedLast = "";
        this._cache = [];
        this._leftMessageCache = [];
        this._deadCache = [];
    }
    reloadClient() {
        this.emit("reloadClient");
    }
    banFromRegistering() {
        this._cannotRegister = true;
    }
    get cannotRegister() {
        return this._cannotRegister;
    }
    set gameClickedLast(game) {
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
    emit(event, ...args) {
        for (let i = 0; i < this._sockets.length; i++) {
            this._sockets[i].emit(event, ...args);
        }
    }
    addSocket(socket) {
        this._sockets.push(socket);
    }
    removeSocket(socket) {
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
    sound(sound) {
        this.emit("sound", sound);
    }
    get session() {
        return this._session;
    }
    get disconnected() {
        return this._disconnected;
    }
    disconnect() {
        this._disconnected = true;
    }
    get game() {
        return this._game;
    }
    get id() {
        return this._id;
    }
    get inGame() {
        return this._inGame;
    }
    set game(game) {
        this._game = game;
    }
    set inGame(isInGame) {
        this._inGame = isInGame;
    }
    /**
     * Sets html title of client.
     */
    set title(title) {
        this.emit("setTitle", title);
    }
    get registered() {
        return this._registered;
    }
    register() {
        this.emit("registered", this.username);
        this._registered = true;
    }
    setUsername(username) {
        this._username = username;
    }
    get username() {
        return this._username;
    }
    updateGameListing(name, userNameColorPairs, uid, inPlay) {
        let usernames = [];
        let userColors = [];
        for (let i = 0; i < userNameColorPairs.length; i++) {
            userColors.push(userNameColorPairs[i].color);
            usernames.push(userNameColorPairs[i].username);
        }
        this.emit("updateGame", name, usernames, userColors, uid, inPlay);
    }
    verifyAsAdmin(msg) {
        if (msg == "!" + password) {
            this._admin = true;
            return true;
        }
        else {
            return false;
        }
    }
    get admin() {
        return this._admin;
    }
    /**
     * send message to this user and only this user
     * @param msg
     */
    send(text, textColor, backgroundColor, usernameColor) {
        if (typeof text == "string") {
            this.emit("message", [
                {
                    text: text,
                    color: textColor,
                },
            ], backgroundColor);
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
        }
        else {
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
    rightSend(msg, textColor, backgroundColor) {
        if (typeof msg == "string") {
            this.emit("rightMessage", [
                { text: msg, color: textColor, backgroundColor: backgroundColor },
            ]);
        }
        else {
            this.emit("rightMessage", msg);
        }
    }
    leftSend(message, textColor, backgroundColor) {
        this.emit("leftMessage", [
            { text: message, color: textColor, backgroundColor: backgroundColor },
        ]);
        this._leftMessageCache.push([
            { text: message, color: textColor, backgroundColor: backgroundColor },
        ]);
    }
    removeRight(msg) {
        this.emit("removeRight", msg);
    }
    removeLeft(msg) {
        this.emit("removeLeft", msg);
    }
    lineThroughUser(msg, color) {
        this.emit("lineThroughPlayer", msg, color);
    }
    markAsDead(msg) {
        this.emit("markAsDead", msg);
        this._deadCache.push(msg);
    }
    /**
     * Removes another user's username from the lobby
     * E.g the other user has left.
     * @param username
     * @param game
     */
    removePlayerListingFromGame(username, game) {
        this.emit("removePlayerFromGameList", username, game.uid);
    }
    addListingToGame(username, color, game) {
        this.emit("addPlayerToGameList", username, color, game.uid);
    }
    markGameStatusInLobby(game, status) {
        this.emit("markGameStatusInLobby", game.uid, status);
    }
    addPlayerToLobbyList(username) {
        this.emit("addPlayerToLobbyList", username);
    }
    removePlayerFromLobbyList(username) {
        this.emit("removePlayerFromLobbyList", username);
    }
    get deadCache() {
        return this._deadCache;
    }
    lobbyMessage(msg, textColor, backgroundColor) {
        this.emit("lobbyMessage", [
            { text: msg, color: textColor, backgroundColor: backgroundColor },
        ]);
    }
    setTime(time, warn) {
        this.emit("setTime", time, warn);
        this._time = time;
        this._warn = warn;
        this._stopwatch.restart();
        this._stopwatch.start();
    }
    getTime() {
        return this._time - this._stopwatch.time;
    }
    getWarn() {
        return this._warn;
    }
    get startVote() {
        return this._startVote;
    }
    set startVote(startVote) {
        this._startVote = startVote;
    }
    set color(color) {
        this._color = color;
    }
    get color() {
        return this._color;
    }
    equals(otherUser) {
        return this.id == otherUser.id;
    }
    registrationError(message) {
        this.emit("registrationError", message);
    }
    addNewGameToLobby(name, type, uid) {
        this.emit("addNewGameToLobby", name, type, uid);
    }
    removeGameFromLobby(uid) {
        this.emit("removeGameFromLobby", uid);
    }
    headerSend(message) {
        this.emit("headerTextMessage", message);
    }
    cancelVoteEffect() {
        this.emit("cancelVoteEffect");
    }
    selectUser(username) {
        this.emit("selectPlayer", username);
        this._selectedUserName = username;
    }
    get selectedUsername() {
        return this._selectedUserName;
    }
    canVote() {
        this.emit("canVote");
        this._canVote = true;
    }
    cannotVote() {
        this.emit("cannotVote");
        this._canVote = false;
    }
    get ifCanVote() {
        return this._canVote;
    }
    hang(usernames) {
        this.emit("hang", usernames);
    }
    resetGallows() {
        this.emit("resetGallows");
    }
}
exports.User = User;
//# sourceMappingURL=user.js.map