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
import { Player, Message } from "./player";
import { Game } from "./game";
import { Utils, Colors } from "./utils";
import { thisExpression } from "../node_modules/@types/babel-types";
const grawlix = require("grawlix");

export class Server {
  private _players: Array<Player> = [];
  private _games: Array<Game> = [];
  private _registeredPlayerCount: number = 0;
  private _debugMode: boolean = false;
  private _lobbyChatCache: Array<Message> = [];
  public constructor() {
    this._registeredPlayerCount = 0;
    this._games = [];
    //join waiting players to games that need them
    setInterval(this.joinGame.bind(this), 50);
  }
  public reloadClient(id: string) {
    console.log("reloadClient");
    let player = this.getPlayer(id);
    if (player instanceof Player) {
      player.reloadClient();
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
    let player = this.getPlayer(id);
    if (player) {
      player.gameClickedLast = gameId;
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
  public get playerNameColorPairs() {
    let playerNameColorPairs = [];
    for (let i = 0; i < this._games.length; i++) {
      playerNameColorPairs.push(this._games[i].playerNameColorPairs);
    }
    return playerNameColorPairs;
  }
  public addGame(game: Game) {
    this._games.push(game);
    for (let i = 0; i < this._players.length; i++) {
      this._players[i].addNewGameToLobby(game.name, game.gameType, game.uid);
    }
  }
  public removeGame(game: Game) {
    let index = this._games.indexOf(game);
    if (index != -1) {
      for (let i = 0; i < this._players.length; i++) {
        this._players[i].removeGameFromLobby(this._games[index].uid);
      }
      this._games.splice(index, 1);
    }
  }
  public leaveGame(id: string) {
    let player = this.getPlayer(id);
    if (player instanceof Player) {
      if (player.registered && player.inGame) {
        if (player.game != undefined) {
          if (player.game.inPlay == false || player.game.inEndChat) {
            player.game.kick(player);
            player.resetAfterGame();
          } else if (player.game.inPlay) {
            //if game is in play, disconnect the player from the client
            //without destroying its data (its role etc.)
            player.disconnect();
            player.game.disconnect(player);
            let index = this._players.indexOf(player);
            if (index != -1) {
              this._players.splice(index, 1)[0];
            }
            player.reloadClient();
          }
        }
      }
    }
  }
  //join waiting players to games
  private joinGame() {
    this._players.forEach(player => {
      if (player.registered && !player.inGame && player.gameClickedLast != "") {
        let j = this.getIndexOfGameById(player.gameClickedLast);
        if (j != undefined) {
          //if game needs a player
          if (this._games[j].playersNeeded > 0) {
            player.inGame = true;
            player.game = this._games[j];
            player.send(
              "Hi, " +
                player.username +
                "! You have joined '" +
                player.game.name +
                "'.",
            );
            this._games[j].broadcast(player.username + " has joined the game");
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
            this._games[j].addPlayer(player);
            if (this._games[j].minimumPlayersNeeded > 0) {
              player.send(
                "The game will begin when at least " +
                  this._games[j].minimumPlayersNeeded.toString() +
                  " more players have joined",
              );
              //if just hit the minimum number of players
            } else if (this._games[j].minimumPlayersNeeded == 0) {
              player.send(
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
  private validateUsername(player: Player, username: string) {
    let letters = /^[A-Za-z]+$/;
    for (let i = 0; i < this._players.length; i++) {
      if (this._players[i].username == username) {
        player.registrationError(
          "This username has already been taken by someone",
        );
        return false;
      }
    }
    if (username.length == 0) {
      player.registrationError("Cannot be 0 letters long");
      return false;
    }
    if (username.length > 10) {
      player.registrationError("Must be no more than 10 letters long");
      return false;
    }
    if (!letters.test(username)) {
      player.registrationError(
        "Must only contain letters (no numbers or punctuation)",
      );
      return false;
    }
    if (grawlix.isObscene(username)) {
      player.registrationError("Usernames can't contain profanity");
      return false;
    }
    return true;
  }
  public addPlayer(
    socket: Socket,
    session: string,
    id: string,
  ): string | undefined {
    let output = undefined;
    let newPlayer = new Player(id, session);
    if (!this._debugMode) {
      let alreadyPlaying: boolean = false;
      for (let i = 0; i < this._players.length; i++) {
        if (
          this._players[i].registered &&
          this._players[i].session == session
        ) {
          let thisPlayer = this._players[i];
          alreadyPlaying = true;
          if (this._players[i].socketCount < 3) {
            console.log("added Socket");
            this._players[i].addSocket(socket);
            output = this._players[i].id;
            //update lobby list for the client
            for (let i = 0; i < this._players.length; i++) {
              if (this._players[i].registered) {
                socket.emit("addPlayerToLobbyList", this._players[i].username);
              }
            }
            //send the client into the correct game or to the lobby
            let game = this._players[i].game;
            if (!this._players[i].inGame) {
              socket.emit("transitionToLobby");
            } else if (game != undefined) {
              socket.emit("transitionToGame", game.name, game.uid, game.inPlay);
              //send stored messages to the central and left boxes
              for (let j = 0; j < this._players[i].cache.length; j++) {
                socket.emit("message", this._players[i].cache[j]);
              }
              for (let j = 0; j < this._players[i].leftCache.length; j++) {
                socket.emit("leftMessage", this._players[i].leftCache[j]);
              }
            }
            //send the client the correct time
            socket.emit(
              "setTime",
              this._players[i].getTime(),
              this._players[i].getWarn(),
            );
            //let the client know if they can vote at this time, or not.
            if (thisPlayer.ifCanVote) {
              thisPlayer.canVote();
              thisPlayer.selectPlayer(thisPlayer.selectedPlayerName);
            } else {
              thisPlayer.cannotVote();
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
        newPlayer.addSocket(socket);
        this._players.push(newPlayer);
      }
    } else {
      newPlayer.addSocket(socket);
      this._players.push(newPlayer);
    }
    //update lobby chat for the client
    for (let i = 0; i < this._lobbyChatCache.length; i++) {
      socket.emit("lobbyMessage", this._lobbyChatCache[i]);
    }
    //update the games for the player as they have been absent for about 2 seconds, if they were reloading.
    for (let j = 0; j < this._games.length; j++) {
      this._players[this._players.length - 1].updateGameListing(
        "Game " + (j + 1).toString(),
        this._games[j].playerNameColorPairs,
        this._games[j].uid,
        this._games[j].inPlay,
      );
    }
    console.log("Player length on add: " + this._players.length);
    return output;
  }
  private register(player: Player, msg: string) {
    if (!this._debugMode) {
      if (player.cannotRegister) {
        player.registrationError(
          "You're already playing in a different tab, so you can't join again.",
        );
        return;
      }
      for (let i = 0; i < this._players.length; i++) {
        if (
          this._players[i].inGame &&
          this._players[i].session == player.session
        ) {
          player.send(
            "You're already playing a game in a different tab, so you cannot join this one.",
            undefined,
            Colors.red,
          );
          player.banFromRegistering();
          return;
        }
      }
    }
    let game = this.getGameById(player.gameClickedLast);
    if (game != undefined) {
      if (game.playersNeeded == 0) {
        player.send(
          "This game is has already started, please join a different one.",
        );
        return;
      }
    }

    msg = Server.cleanUpUsername(msg);

    if (this.validateUsername(player, msg)) {
      for (let i = 0; i < this._players.length; i++) {
        if (this._players[i].registered) {
          player.addPlayerToLobbyList(this._players[i].username);
        }
      }
      player.setUsername(msg);
      player.register();
      this._registeredPlayerCount++;
      for (let i = 0; i < this._players.length; i++) {
        this._players[i].addPlayerToLobbyList(player.username);
      }
    }
  }
  public receiveLobbyMessage(id: string, msg: string) {
    let player = this.getPlayer(id);
    if (player instanceof Player && player.registered) {
      for (let i = 0; i < this._players.length; i++) {
        this._players[i].lobbyMessage(
          player.username + " : " + msg,
          Colors.standardWhite,
        );
      }
      this._lobbyChatCache.push([
        {
          text: player.username + " : " + msg,
          textColor: Colors.standardWhite,
        },
      ]);
      if (this._lobbyChatCache.length > 50) {
        this._lobbyChatCache.splice(0, 1);
      }
    }
  }
  public receive(id: string, msg: string) {
    let player = this.getPlayer(id);
    if (player != undefined) {
      if (!player.registered) {
        this.register(player, msg);
      } else {
        if (player.inGame) {
          //if trying to sign in as admin
          if (msg.slice(0, 1) == "!") {
            if (player.verifyAsAdmin(msg)) {
              player.send(
                "You have been granted administrator access",
                undefined,
                Colors.green,
              );
            }
            if (player.admin) {
              if (player.game != undefined && player.game.isPlayer(id)) {
                player.game.adminReceive(player, msg);
              }
            }
          } else if (
            msg[0] == "/" &&
            player.game != undefined &&
            !player.game.inPlay &&
            player.startVote == false
          ) {
            if (Utils.isCommand(msg, "/start")) {
              player.startVote = true;
              player.game.broadcast(
                player.username +
                  ' has voted to start the game immediately by typing "/start"',
              );
            }
          } else if (player.game != undefined && this.validateMessage(msg)) {
            msg = grawlix(msg, { style: "asterix" });
            if (player.game.isPlayer(id)) {
              player.game.receive(player, msg);
              console.log("received by game");
            }
          }
        }
      }
    } else {
      console.log("Player: " + id.toString() + " is not defined");
    }
  }
  public isPlayer(id: string): boolean {
    for (let i = 0; i < this._players.length; i++) {
      if (this._players[i].id == id) {
        return true;
      }
    }
    return false;
  }
  public getPlayer(id: string): Player | undefined {
    for (let i = 0; i < this._players.length; i++) {
      if (this._players[i].id == id) {
        return this._players[i];
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
    for (let i = 0; i < this._players.length; i++) {
      this._players[i].markGameStatusInLobby(game, status);
    }
  }
  public listPlayerInLobby(username: string, color: string, game: Game) {
    for (let i = 0; i < this._players.length; i++) {
      this._players[i].addListingToGame(username, color, game);
      //if the player is viewing the game, add joiner to their right bar
      if (this._players[i].game != undefined && this._players[i].game == game) {
        this._players[i].rightSend(username);
      } else if (
        !this._players[i].inGame &&
        this._players[i].gameClickedLast == game.uid
      ) {
        this._players[i].rightSend(username);
      }
    }
  }
  public unlistPlayerInLobby(username: string, game: Game) {
    for (let i = 0; i < this._players.length; i++) {
      this._players[i].removePlayerListingFromGame(username, game);
      //if the player is viewing the game, remove leaver from their right bar
      if (this._players[i].game == game) {
        this._players[i].removeRight(username);
      } else if (
        !this._players[i].inGame &&
        this._players[i].gameClickedLast == game.uid
      ) {
        this._players[i].removeRight(username);
      }
    }
  }
  public removeSocketFromPlayer(id: string, socket: Socket) {
    for (let i = 0; i < this._players.length; i++) {
      if (this._players[i].id == id) {
        this._players[i].removeSocket(socket);
      }
    }
  }
  public kick(id: string): void {
    let player = this.getPlayer(id);
    if (player instanceof Player) {
      //if player has no sockets (i.e no one is connected to this player)
      if (player.socketCount == 0) {
        let index = this._players.indexOf(player);
        if (index !== -1) {
          //if the player isn't in a game in play, remove them
          if (!player.inGame || !player.registered) {
            this._players.splice(index, 1)[0];
            for (let i = 0; i < this._players.length; i++) {
              this._players[i].removePlayerFromLobbyList(player.username);
            }
          } else if (
            player.inGame &&
            player.game != undefined &&
            !player.game.inPlay
          ) {
            for (let i = 0; i < this._players.length; i++) {
              this._players[i].removePlayerFromLobbyList(player.username);
            }
            player.game.kick(player);
            this._players.splice(index, 1)[0];
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
