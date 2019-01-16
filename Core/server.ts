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
import { User, Message } from "./user";
import { Game } from "./game";
import { Utils, Colors } from "./utils";
const grawlix = require("grawlix");

export class Server {
  private _users: Array<User> = [];
  private _games: Array<Game> = [];
  private _debugMode: boolean = false;
  private _lobbyChatCache: Array<Message> = [];
  public constructor() {
    this._games = [];
    //join waiting users to games that need them
    setInterval(this.joinGame.bind(this), 50);
  }
  public reloadClient(id: string) {
    console.log("reloadClient");
    let user = this.getUser(id);
    if (user instanceof User) {
      user.reloadClient();
      console.log("called reload");
    }
  }
  get games() {
    return this._games;
  }
  public setDebug() {
    this._debugMode = true;
  }
  public gameClick(id: string, gameId: string) {
    let user = this.getUser(id);
    if (user) {
      user.gameClickedLast = gameId;
    }
  }
  public get gameTypes() {
    let gameTypes = [];
    for (let i = 0; i < this.numberOfGames; i++) {
      gameTypes.push(this._games[i].gameType);
    }
    return gameTypes;
  }
  public get inPlayArray() {
    let inPlayArray = [];
    for (let i = 0; i < this._games.length; i++) {
      inPlayArray.push(this._games[i].inPlay);
    }
    return inPlayArray;
  }
  public get numberOfGames() {
    return this._games.length;
  }
  public getGameById(uid: string): Game | undefined {
    for (let i = 0; i < this._games.length; i++) {
      if (this._games[i].uid == uid) {
        return this._games[i];
      }
    }
    return undefined;
  }
  public getIndexOfGameById(uid: string): number | undefined {
    for (let i = 0; i < this._games.length; i++) {
      if (this._games[i].uid == uid) {
        return i;
      }
    }
    return undefined;
  }
  public get usernameColorPairs() {
    let usernameColorPairs = [];
    for (let i = 0; i < this._games.length; i++) {
      usernameColorPairs.push(this._games[i].usernameColorPairs);
    }
    return usernameColorPairs;
  }
  public addGame(game: Game) {
    this._games.push(game);
    for (let i = 0; i < this._users.length; i++) {
      this._users[i].addNewGameToLobby(game.name, game.gameType, game.uid);
    }
  }
  public removeGame(game: Game) {
    let index = this._games.indexOf(game);
    if (index != -1) {
      for (let i = 0; i < this._users.length; i++) {
        this._users[i].removeGameFromLobby(this._games[index].uid);
      }
      this._games.splice(index, 1);
    }
  }
  public leaveGame(id: string) {
    let user = this.getUser(id);
    if (user instanceof User) {
      if (user.registered && user.inGame) {
        if (user.game != undefined) {
          if (user.game.inPlay == false || user.game.inEndChat) {
            user.game.kick(user);
            user.resetAfterGame();
          } else if (user.game.inPlay) {
            //if game is in play, disconnect the player from the client
            //without destroying its data (its role etc.)
            user.disconnect();
            user.game.disconnect(user);
            let index = this._users.indexOf(user);
            if (index != -1) {
              this._users.splice(index, 1)[0];
            }
            user.reloadClient();
          }
        }
      }
    }
  }
  //join waiting players to games
  private joinGame() {
    this._users.forEach(user => {
      if (user.registered && !user.inGame && user.gameClickedLast != "") {
        let j = this.getIndexOfGameById(user.gameClickedLast);
        if (j != undefined) {
          //if game needs a player
          if (this._games[j].playersNeeded > 0) {
            user.inGame = true;
            user.game = this._games[j];
            user.send(
              "Hi, " +
                user.username +
                "! You have joined '" +
                user.game.name +
                "'.",
            );
            this._games[j].broadcast(user.username + " has joined the game");
            if (this._games[j].minimumPlayersNeeded - 1 > 0) {
              this._games[j].broadcast(
                "The game will begin when at least " +
                  (this._games[j].minimumPlayersNeeded - 1).toString() +
                  " more players have joined",
              );
              //if just hit the minimum number of players
            } else if (this._games[j].minimumPlayersNeeded - 1 == 0) {
              this._games[j].broadcast(
                'The game will start in 30 seconds. Type "/start" to start the game now',
              );
            }
            this._games[j].addUser(user);
            if (this._games[j].minimumPlayersNeeded > 0) {
              user.send(
                "The game will begin when at least " +
                  this._games[j].minimumPlayersNeeded.toString() +
                  " more players have joined",
              );
              //if just hit the minimum number of players
            } else if (this._games[j].minimumPlayersNeeded == 0) {
              user.send(
                'The game will start in 30 seconds. Type "/start" to start the game now',
              );
              this._games[j].setAllTime(this._games[j].startWait, 10000);
            }
          }
        }
      }
    });
  }
  private static cleanUpUsername(username: string) {
    username = username.toLowerCase();
    username = username.replace(/\s/g, "");
    return username;
  }
  private validateUsername(user: User, username: string) {
    let letters = /^[A-Za-z]+$/;
    for (let i = 0; i < this._users.length; i++) {
      if (this._users[i].username == username) {
        user.registrationError(
          "This username has already been taken by someone",
        );
        return false;
      }
    }
    if (username.length == 0) {
      user.registrationError("Cannot be 0 letters long");
      return false;
    }
    if (username.length > 10) {
      user.registrationError("Must be no more than 10 letters long");
      return false;
    }
    if (!letters.test(username)) {
      user.registrationError(
        "Must only contain letters (no numbers or punctuation)",
      );
      return false;
    }
    if (grawlix.isObscene(username)) {
      user.registrationError("Usernames can't contain profanity");
      return false;
    }
    return true;
  }
  public addUser(
    socket: Socket,
    session: string,
    id: string,
  ): string | undefined {
    let output = undefined;
    let newUser = new User(id, session);
    if (!this._debugMode) {
      let alreadyPlaying: boolean = false;
      for (let i = 0; i < this._users.length; i++) {
        if (this._users[i].registered && this._users[i].session == session) {
          let thisUser = this._users[i];
          alreadyPlaying = true;
          if (this._users[i].socketCount < 3) {
            console.log("added Socket");
            this._users[i].addSocket(socket);
            output = this._users[i].id;
            //update lobby list for the client
            for (let i = 0; i < this._users.length; i++) {
              if (this._users[i].registered) {
                socket.emit("addPlayerToLobbyList", this._users[i].username);
              }
            }
            //send the client into the correct game or to the lobby
            let game = this._users[i].game;
            if (!this._users[i].inGame) {
              socket.emit("transitionToLobby");
            } else if (game != undefined) {
              socket.emit("transitionToGame", game.name, game.uid, game.inPlay);
              //send stored messages to the central and left boxes
              for (let j = 0; j < this._users[i].cache.length; j++) {
                socket.emit(
                  "message",
                  this._users[i].cache[j].msg,
                  this._users[i].cache[j].color,
                );
              }
              for (let j = 0; j < this._users[i].leftCache.length; j++) {
                socket.emit("leftMessage", this._users[i].leftCache[j]);
              }
              for (let j = 0; j < this._users[i].deadCache.length; j++) {
                socket.emit("markAsDead", this._users[i].deadCache[j]);
                socket.emit(
                  "lineThroughPlayer",
                  this._users[i].deadCache[j],
                  Colors.brightRed,
                );
              }
            }
            //send the client the correct time
            socket.emit(
              "setTime",
              this._users[i].getTime(),
              this._users[i].getWarn(),
            );
            //let the client know if they can vote at this time, or not.
            if (thisUser.ifCanVote) {
              thisUser.canVote();
              thisUser.selectUser(thisUser.selectedUsername);
            } else {
              thisUser.cannotVote();
            }
          } else {
            socket.emit(
              "registrationError",
              "You can't have more than 3 game tabs open at once.",
            );
          }
        }
      }
      if (!alreadyPlaying) {
        newUser.addSocket(socket);
        this._users.push(newUser);
      }
    } else {
      newUser.addSocket(socket);
      this._users.push(newUser);
    }
    //update lobby chat for the client
    for (let i = 0; i < this._lobbyChatCache.length; i++) {
      socket.emit("lobbyMessage", this._lobbyChatCache[i]);
    }
    //update the games for the player as they have been absent for about 2 seconds, if they were reloading.
    for (let j = 0; j < this._games.length; j++) {
      this._users[this._users.length - 1].updateGameListing(
        "Game " + (j + 1).toString(),
        this._games[j].usernameColorPairs,
        this._games[j].uid,
        this._games[j].inPlay,
      );
    }
    console.log("Player length on add: " + this._users.length);
    return output;
  }
  private register(user: User, msg: string) {
    if (!this._debugMode) {
      if (user.cannotRegister) {
        user.registrationError(
          "You're already playing in a different tab, so you can't join again.",
        );
        return;
      }
      for (let i = 0; i < this._users.length; i++) {
        if (this._users[i].inGame && this._users[i].session == user.session) {
          user.send(
            "You're already playing a game in a different tab, so you cannot join this one.",
            undefined,
            Colors.red,
          );
          user.banFromRegistering();
          return;
        }
      }
    }
    let game = this.getGameById(user.gameClickedLast);
    if (game != undefined) {
      if (game.playersNeeded == 0) {
        user.send(
          "This game is has already started, please join a different one.",
        );
        return;
      }
    }

    msg = Server.cleanUpUsername(msg);

    if (this.validateUsername(user, msg)) {
      for (let i = 0; i < this._users.length; i++) {
        if (this._users[i].registered) {
          user.addPlayerToLobbyList(this._users[i].username);
        }
      }
      user.setUsername(msg);
      user.register();
      for (let i = 0; i < this._users.length; i++) {
        this._users[i].addPlayerToLobbyList(user.username);
      }
    }
  }
  public receiveLobbyMessage(id: string, msg: string) {
    let user = this.getUser(id);
    if (user instanceof User && user.registered) {
      for (let i = 0; i < this._users.length; i++) {
        this._users[i].lobbyMessage(
          user.username + " : " + msg,
          Colors.standardWhite,
        );
      }
      this._lobbyChatCache.push([
        {
          text: user.username + " : " + msg,
          color: Colors.standardWhite,
        },
      ]);
      if (this._lobbyChatCache.length > 50) {
        this._lobbyChatCache.splice(0, 1);
      }
    }
  }
  public receive(id: string, msg: string) {
    let user = this.getUser(id);
    if (user != undefined) {
      if (!user.registered) {
        this.register(user, msg);
      } else {
        if (user.inGame) {
          //if trying to sign in as admin
          if (msg.slice(0, 1) == "!") {
            if (user.verifyAsAdmin(msg)) {
              user.send(
                "You have been granted administrator access",
                undefined,
                Colors.green,
              );
            }
            if (user.admin) {
              if (user.game != undefined && user.game.isPlayer(id)) {
                user.game.adminReceive(user, msg);
              }
            }
          } else if (
            msg[0] == "/" &&
            user.game != undefined &&
            !user.game.inPlay &&
            user.startVote == false
          ) {
            if (Utils.isCommand(msg, "/start")) {
              user.startVote = true;
              user.game.broadcast(
                user.username +
                  ' has voted to start the game immediately by typing "/start"',
              );
            }
          } else if (user.game != undefined && this.validateMessage(msg)) {
            msg = grawlix(msg, { style: "asterix" });
            if (user.game.isPlayer(id)) {
              user.game.receive(user, msg);
              console.log("received by game");
            }
          }
        }
      }
    } else {
      console.log("Player: " + id.toString() + " is not defined");
    }
  }
  public isUser(id: string): boolean {
    for (let i = 0; i < this._users.length; i++) {
      if (this._users[i].id == id) {
        return true;
      }
    }
    return false;
  }
  public getUser(id: string): User | undefined {
    for (let i = 0; i < this._users.length; i++) {
      if (this._users[i].id == id) {
        return this._users[i];
      }
    }
    console.log("Error: Server.getPlayer: No player found with given id");
    return undefined;
  }
  private validateMessage(msg: string): boolean {
    if (msg.trim() == "" || msg.length > 151) {
      return false;
    } else {
      return true;
    }
  }
  public markGameStatusInLobby(game: Game, status: string) {
    for (let i = 0; i < this._users.length; i++) {
      this._users[i].markGameStatusInLobby(game, status);
    }
  }
  public listPlayerInLobby(username: string, color: Colors, game: Game) {
    for (let i = 0; i < this._users.length; i++) {
      this._users[i].addListingToGame(username, color, game);
      //if the player is viewing the game, add joiner to their right bar
      if (this._users[i].game != undefined && this._users[i].game == game) {
        this._users[i].rightSend([{ text: username, color: color }]);
      } else if (
        !this._users[i].inGame &&
        this._users[i].gameClickedLast == game.uid
      ) {
        this._users[i].rightSend([{ text: username, color: color }]);
      }
    }
  }
  public unlistPlayerInLobby(username: string, game: Game) {
    for (let i = 0; i < this._users.length; i++) {
      this._users[i].removePlayerListingFromGame(username, game);
      //if the player is viewing the game, remove leaver from their right bar
      if (this._users[i].game == game) {
        this._users[i].removeRight(username);
      } else if (
        !this._users[i].inGame &&
        this._users[i].gameClickedLast == game.uid
      ) {
        this._users[i].removeRight(username);
      }
    }
  }
  public removeSocketFromPlayer(id: string, socket: Socket) {
    for (let i = 0; i < this._users.length; i++) {
      if (this._users[i].id == id) {
        this._users[i].removeSocket(socket);
      }
    }
  }
  public kick(id: string): void {
    let user = this.getUser(id);
    if (user instanceof User) {
      //if player has no sockets (i.e no one is connected to this player)
      if (user.socketCount == 0) {
        let index = this._users.indexOf(user);
        if (index !== -1) {
          //if the player isn't in a game in play, remove them
          if (!user.inGame || !user.registered) {
            this._users.splice(index, 1)[0];
            for (let i = 0; i < this._users.length; i++) {
              this._users[i].removePlayerFromLobbyList(user.username);
            }
          } else if (
            user.inGame &&
            user.game != undefined &&
            !user.game.inPlay
          ) {
            for (let i = 0; i < this._users.length; i++) {
              this._users[i].removePlayerFromLobbyList(user.username);
            }
            user.game.kick(user);
            this._users.splice(index, 1)[0];
          }
        }
      }
    } else {
      console.log(
        "Error: Server.kick" +
          ": tried to kick player " +
          "id" +
          " but that player does not exist",
      );
    }
  }
}
