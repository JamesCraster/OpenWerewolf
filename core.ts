/* 
    OpenWerewolf, an online mafia game.
    Copyright (C) 2017 James V. Craster  

    This file is part of OpenWerewolf. 
    OpenWerewolf is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, version 3 of the License.
    OpenWerewolf is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.
    You should have received a copy of the GNU Affero General Public License
    along with OpenWerewolf.  If not, see <http://www.gnu.org/licenses/>.
    
    Additional terms under GNU AGPL version 3 section 7:
    I (James Craster) require the preservation of this specified author attribution 
    in the Appropriate Legal Notices displayed by works containing material that has 
    been added to OpenWerewolf by me: 
    "This project includes code from OpenWerewolf. OpenWerewolf author: James V. Craster." 
*/

"use strict";

import { Socket } from "./node_modules/@types/socket.io";

//import statements
var express = require("express");
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);
var grawlix = require("grawlix");

export class Utils {
  static shuffle(deck: Array<string>): Array<string> {
    let randomDeck = [];
    let hat = deck.slice();
    while (hat.length !== 0) {
      let rIndex = Math.floor(hat.length * Math.random());
      randomDeck.push(hat[rIndex]);
      hat.splice(rIndex, 1);
    }
    return randomDeck;
  }
}

interface PlayerData {
  [key: string]: any;
}
export class Player {
  //true if the player has a username
  private _registered: boolean = false;
  private _socket: Socket;
  private _inGame: boolean = false;
  private _username: string = "randomuser";
  //object that can be used to flexibly add data to player for game purposes
  public data: PlayerData = {};
  //index of the game the player is in in the server's 'games' array
  private _game: number = -1;
  public constructor(socket: Socket) {
    this._socket = socket;
    this._username = "randomuser";
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
  get registered() {
    return this._registered;
  }
  public register() {
    this._registered = true;
  }
  public setUsername(username: string) {
    this._username = username;
  }
  get username() {
    return this._username;
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
  public send(msg: string) {
    this._socket.emit("message", msg);
  }
  get socket() {
    return this._socket;
  }
}

export class Server {
  private _players: Array<Player> = [];
  private _games: Array<Game> = [];
  private _registeredPlayerCount: number = 0;
  public constructor() {
    this._registeredPlayerCount = 0;
    this._games = [];
    //call joinGame() every 50 ms to join waiting players to games that need them
    setInterval(this.joinGame.bind(this), 50);
  }
  public addGame(game: Game) {
    this._games.push(game);
  }
  //join waiting players to games
  private joinGame() {
    //for(var i = 0; i < this._players.length; i++){
    this._players.forEach(player => {
      //if player is registered and waiting to join a game
      if (player.registered && !player.inGame) {
        for (var j = 0; j < this._games.length; j++) {
          //if game needs a player
          if (this._games[j].playersNeeded > 0) {
            this._games[j].addPlayer(player);
            player.inGame = true;
            player.game = j;
            player.send(
              "Hi, " +
              player.username +
              "! You have joined Game " +
              (j + 1).toString() +
              "."
            );
            this._games[j].broadcast(player.username + " has joined the game");
            player.send("There are " + this._games[j].playerCount + " players in this game");
            if (this._games[j].minimumPlayersNeeded > 0) {
              this._games[j].broadcast("The game will begin when at least " + this._games[j].minimumPlayersNeeded + " more players have joined");
            } else {
              //should be replaced shortly when flexible game sizes implemented
              this._games[j].broadcast("The game will start now");
            }
            break;
          }
        }
        //otherwise (there must be a better way, instead of spamming the chat full!)
        if (player.inGame == false) {
          player.send(
            "All Games are currently full. Games only last 5 minutes, so there should be one available very soon!"
          );
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
    var letters = /^[A-Za-z]+$/;
    for (var i = 0; i < this._players.length; i++) {
      if (this._players[i].username == username) {
        player.send(
          "Invalid username: This username has already been taken by someone"
        );
        return false;
      }
    }
    if (username.length == 0) {
      player.send("Invalid username: Cannot be 0 letters long");
      return false;
    }
    if (username.length > 10) {
      player.send("Invalid username: Must be no more than 10 letters long");
      return false;
    }
    if (!letters.test(username)) {
      player.send(
        "Invalid username: Must only contain letters (no numbers or punctuation)"
      );
      return false;
    }
    if (grawlix.isObscene(username)) {
      player.send("Invalid username: Usernames can't contain swearwords");
      return false;
    }
    return true;
  }
  //send message to all players on the server
  private static broadcast(msg: string) {
    if (msg.trim() != "") {
      io.emit("message", msg);
    }
  }
  public addPlayer(socket: Socket) {
    this._players.push(new Player(socket));
    console.log("Player length on add: " + this._players.length);
  }
  private register(player: Player, msg: string) {
    //get rid of spaces in name and make lowercase
    msg = Server.cleanUpUsername(msg);

    if (this.validateUsername(player, msg)) {
      player.register();
      player.setUsername(msg);
      this._registeredPlayerCount++;
    }
  }
  public receive(id: string, msg: string) {
    let player = this.getPlayer(id);
    if (player != undefined) {
      if (!player.registered) {
        this.register(player, msg);
      } else {
        if (this.validateMessage(msg)) {
          msg = grawlix(msg, { style: "asterix" });
          this._games[player.game].receive(id, msg);
        }
      }
    } else {
      console.log("Player: " + id.toString() + " is not defined");
    }
  }
  public isPlayer(id: string): boolean {
    for (var i = 0; i < this._players.length; i++) {
      if (this._players[i].id == id) {
        return true;
      }
    }
    return false;
  }
  public getPlayer(id: string): Player | undefined {
    for (var i = 0; i < this._players.length; i++) {
      if (this._players[i].id == id) {
        return this._players[i];
      }
    }
    console.log("Error: Server.getPlayer: No player found with given id");
    return undefined;
  }
  public validateMessage(msg: string): boolean {
    if (msg.trim() == "" || msg.length > 151) {
      return false;
    } else {
      return true;
    }
  }

  public kick(id: string): void {
    var player = this.getPlayer(id);
    if (player instanceof Player) {
      console.log(player.username);
      var index = this._players.indexOf(player);
      console.log("Player index: " + index);
      if (index !== -1) {
        console.log("Player length before remove: " + this._players.length);
        console.log(this._players.splice(index, 1)[0].username);
        console.log("Player length after remove: " + this._players.length);
        if (player.registered && this._registeredPlayerCount > 0) {
          this._registeredPlayerCount--;
          if (player.inGame) {
            this._games[player.game].broadcast(
              player.username + " has disconnected"
            );
            this._games[player.game].kick(player);
          }
        }
      }
    } else {
      console.log(
        "Error: Server.kick" +
        ": tried to kick player " +
        "id" +
        " but that player does not exist"
      );
    }
  }
}
export abstract class Game {
  protected _players: Array<Player> = [];
  protected _registeredPlayerCount: number = 0;
  private _minPlayerCount: number = 4;
  protected _maxPlayerCount: number = 4;
  protected _inPlay: boolean = false;
  protected _server: Server;
  public constructor(server: Server) {
    this._server = server;
  }
  get playerCount() {
    return this._registeredPlayerCount;
  }
  get minimumPlayersNeeded() {
    if (this._inPlay) {
      return 0;
    } else {
      return this._minPlayerCount - this._registeredPlayerCount;
    }
  }
  get playersNeeded() {
    if (this._inPlay) {
      return 0;
    } else {
      return this._maxPlayerCount - this._registeredPlayerCount;
    }
  }
  public getPlayer(id: string): Player | undefined {
    for (var i = 0; i < this._players.length; i++) {
      if (this._players[i].id == id) {
        return this._players[i];
      }
    }
    console.log("Error: Game.getPlayer: No player found with given id");
    return undefined;
  }
  public abstract update(): void;
  public addPlayer(player: Player) {
    this._players.push(player);
    this._registeredPlayerCount++;
  }
  public broadcast(msg: string) {
    for (var i = 0; i < this._players.length; i++) {
      this._players[i].send(msg);
    }
  }
  public abstract receive(id: string, msg: string): void;
  public kick(player: Player) {
    let index = this._players.indexOf(player);
    if (index != -1) {
      this._registeredPlayerCount--;
      this._players.splice(index, 1);
    }
  }
  protected start() {
    this._inPlay = true;
  }
  protected end() {
    this._inPlay = false;
    for (let i = 0; i < this._players.length; i++) {
      this._players[i].inGame = false;
    }
    this._players = [];
    this._registeredPlayerCount = 0;
  }
}
/**
 * 
 * Adds 'muted' and 'deafened' properties to Player so that it can be used in a MessageRoom.      
 * Each MessageRoom will have a different MessageRoomMember for the same Player.
 */
export class MessageRoomMember extends Player {
  public _muted: boolean = false;
  public _deafened: boolean = false;
  constructor(socket: Socket) {
    super(socket);
  }
  public get muted(): boolean {
    return this._muted;
  }
  public get deafened() {
    return this._deafened;
  }
  public mute() {
    this._muted = true;
  }
  public unmute() {
    this._muted = false;
  }
  public deafen() {
    this._deafened = true;
  }
  public undeafen() {
    this._deafened = false;
  }
}
export class MessageRoom {
  public _members: Array<MessageRoomMember> = [];
  constructor() { }
  getMemberById(id: string): MessageRoomMember | undefined {
    for (var i = 0; i < this._members.length; i++) {
      if (this._members[i].id == id) {
        return this._members[i];
      }
    }
    console.log(
      "Error: MessageRoom.getMemberById: No message room member found with given id"
    );
    return undefined;
  }
  public broadcast(
    sender: MessageRoomMember | string,
    msg: string,
    game = false
  ) {
    if (game) {
      for (var i = 0; i < this._members.length; i++) {
        if (!this._members[i].deafened) {
          this._members[i].send(msg);
        }
      }
    }
    //if message room member passed in
    if (sender instanceof MessageRoomMember) {
      if (!sender.muted) {
        for (var i = 0; i < this._members.length; i++) {
          if (!this._members[i].deafened) {
            this._members[i].send(msg);
          }
        }
      }
    } else {
      //if id passed in, find the sender within the message room
      let messageRoomSender = this.getMemberById(sender);
      if (messageRoomSender instanceof MessageRoomMember) {
        //do not check for muting if sender is the game itself
        if (game) {
          for (var i = 0; i < this._members.length; i++) {
            if (!this._members[i].deafened) {
              this._members[i].send(msg);
            }
          }
        } else if (!messageRoomSender.muted) {
          for (var i = 0; i < this._members.length; i++) {
            if (!this._members[i].deafened) {
              this._members[i].send(msg);
            }
          }
        }
      }
    }
  }
  addPlayer(player: Player) {
    this._members.push(new MessageRoomMember(player.socket));
  }
  mute(id: string) {
    let member = this.getMemberById(id);
    if (member instanceof MessageRoomMember) {
      member.mute();
    }
  }
  deafen(id: string) {
    let member = this.getMemberById(id);
    if (member instanceof MessageRoomMember) {
      member.deafen();
    }
  }
  unmute(id: string) {
    let member = this.getMemberById(id);
    if (member instanceof MessageRoomMember) {
      member.unmute();
    }
  }
  undeafen(id: string) {
    let member = this.getMemberById(id);
    if (member instanceof MessageRoomMember) {
      member.undeafen();
    }
  }
  muteAll() {
    this._members.forEach(member => {
      member.mute();
    });
  }
  deafenAll() {
    this._members.forEach(member => {
      member.deafen();
    });
  }
  unmuteAll() {
    this._members.forEach(member => {
      member.unmute();
    });
  }
  undeafenAll() {
    this._members.forEach(member => {
      member.undeafen();
    });
  }
}
