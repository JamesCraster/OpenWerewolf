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
    "This project includes code from OpenWerewolf." 
*/

"use strict";

import { Socket } from "./node_modules/@types/socket.io";

//import statements
var express = require("express");
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);
var grawlix = require("grawlix");

//set this to what the admin password should be
const password = "password";

export class Utils {
  /**
   * Shuffles an array
   * @returns {Array<T>} An array of the same elements in random order
   */
  public static shuffle<T>(deck: Array<T>): Array<T> {
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

export class RoleList {
  private readonly _list: Array<string> = [];
  constructor(list: Array<string>) {
    this._list = list;
  }
  get list() {
    return this._list;
  }
}

/**
 * All the colors used in games. No color should be used if it is not in this enum,
 * for consistency.
 */
export enum Colors {
  red = "#950d0d",
  brightRed = "#ff1b1b",
  green = "#017501",
  brightGreen = "#03b603",
  yellow = "#756f00",
  brightYellow = "yellow",
}
/** 
 * Contains style data for text.
 */
export class Style {
  private readonly _backgroundColor: string | undefined;
  private readonly _textColor: string | undefined;
  private readonly _bold: boolean | undefined;
  private readonly _underlined: boolean | undefined;

  constructor(textColor?: string, backgroundColor?: string, bold?: boolean, underlined?: boolean) {
    this._textColor = textColor;
    this._backgroundColor = backgroundColor;
    this._bold = bold;
    this._underlined = underlined;
  }
}
/**
 * @abstract
 * Directs the client to apply the passed in style data to some text by a logical rule.
 */
export abstract class StyleRule {
  private readonly _style: Style;
  constructor(textColor?: string, backgroundColor?: string, bold?: boolean, underlined?: boolean) {
    this._style = new Style(textColor, backgroundColor, bold, underlined);
  }
}
/**
 * Directs client to apply passed in style data to a given keyword in some text.
 */
export class MatchRule extends StyleRule {
  private readonly _keyword: string;

  constructor(keyword: string, textColor?: string, backgroundColor?: string, bold?: boolean, underlined?: boolean) {
    super(textColor, backgroundColor, bold, underlined);
    this._keyword = keyword;
  }

  get keyword() {
    return this._keyword;
  }
}
export class Stopwatch {
  private _time: number = Date.now();
  private _storedElapsed: number = 0;
  private _running: boolean = false;

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

  public constructor(socket: Socket) {
    this._socket = socket;
    this._username = "randomuser";
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
  public send(msg: string, textColor?: string, backgroundColor?: string): void {
    if (textColor && backgroundColor) {
      this._socket.emit("message", msg, textColor, backgroundColor);
    } else if (textColor) {
      this._socket.emit("message", msg, textColor);
    } else if (backgroundColor) {
      this._socket.emit("message", msg, undefined, backgroundColor);
    } else {
      this._socket.emit("message", msg);
    }
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
            player.send("There are " + (this._games[j].playerCount + 1).toString() + " players in this game");
            if (this._games[j].minimumPlayersNeeded - 1 > 0) {
              this._games[j].broadcast("The game will begin when at least " + (this._games[j].minimumPlayersNeeded - 1).toString() + " more players have joined");
              //if just hit the minimum number of players
            } else if (this._games[j].minimumPlayersNeeded - 1 == 0) {
              this._games[j].broadcast("The game will start in 30 seconds. Type \"/start\" to start the game now");
            }
            this._games[j].addPlayer(player);
            if (this._games[j].minimumPlayersNeeded > 0) {
              player.send("The game will begin when at least " + (this._games[j].minimumPlayersNeeded).toString() + " more players have joined");
              //if just hit the minimum number of players
            } else if (this._games[j].minimumPlayersNeeded == 0) {
              player.send("The game will start in 30 seconds. Type \"/start\" to start the game now");
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
        //if trying to sign in as admin 
        if (msg.slice(0, 1) == "!") {
          if (player.verifyAsAdmin(msg)) {
            player.send('You have been granted administrator access', undefined, Colors.green);
          }
          if (player.admin) {
            this._games[player.game].adminReceive(id, msg);
          }
        } else if (this.validateMessage(msg)) {
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
  private validateMessage(msg: string): boolean {
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
            if (!this._games[player.game].inPlay) {
              this._games[player.game].kick(player);
            }
            player.disconnect();
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
  protected readonly _minPlayerCount: number;
  protected readonly _maxPlayerCount: number;
  protected _inPlay: boolean = false;
  protected readonly _server: Server;
  protected readonly startClock: Stopwatch = new Stopwatch();
  protected readonly startWait = 30000;
  protected holdVote: boolean = false;

  public constructor(server: Server, minPlayerCount: number, maxPlayerCount: number) {
    this._server = server;
    this._minPlayerCount = minPlayerCount;
    this._maxPlayerCount = maxPlayerCount;
    setInterval(this.pregameLobbyUpdate.bind(this), 500);
    setInterval(this.update.bind(this), 500);
  }
  get inPlay() {
    return this._inPlay;
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
  private pregameLobbyUpdate() {
    if (!this.inPlay) {
      //if have max number of players, start the game immediately
      if (this._registeredPlayerCount >= this._maxPlayerCount) {
        this.start();
        //if have minimum number of players
      } else if (this._registeredPlayerCount >= this._minPlayerCount) {
        //if startClock has been ticking for startWait time, start:
        if (this.startClock.time > this.startWait) {
          this.start();

          //if a majority has typed /start, start:
        } else if (!this.holdVote) {
          let voteCount = 0;
          for (let i = 0; i < this._players.length; i++) {
            if (this._players[i].data.startVote) {
              voteCount++;
            }
          }
          if (voteCount >= this._players.length / 2) {
            this.start();
          }
        }
        //TODO: if everyone has typed /wait, wait a further 30 seconds up to a limit of 3 minutes:

      } else {
        this.startClock.restart();
        this.startClock.start();
      }
    }
  }
  protected abstract update(): void;
  public addPlayer(player: Player) {
    this._players.push(player);
    this._registeredPlayerCount++;
  }
  public broadcast(msg: string, textColor?: string, backgroundColor?: string) {
    for (var i = 0; i < this._players.length; i++) {
      this._players[i].send(msg, textColor, backgroundColor);
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
  protected beforeStart() {
    this._inPlay = true;
  }
  protected afterEnd() {
    this._inPlay = false;
    for (let i = 0; i < this._players.length; i++) {
      this._players[i].inGame = false;
    }
    this._players = [];
    this._registeredPlayerCount = 0;
  }
  protected abstract start(): void;
  protected abstract end(): void;
  protected broadcastPlayerList() {
    let playersString = "";
    for (let i = 0; i < this._players.length; i++) {
      if (i != 0) {
        playersString += ", "
      }
      playersString += this._players[i].username;
    }
    this.broadcast("Players: " + playersString + ".");
  }
  protected broadcastRoleList(list: Array<string>) {
    let string = "";
    for (let i = 0; i < list.length; i++) {
      if (i != 0) {
        string += ", "
      }
      string += list[i];
    }
    this.broadcast("Roles (in order of when they act): " + string + ".");
  }
  //admin commands
  public adminReceive(id: string, msg: string): void {
    let player = this.getPlayer(id);
    if (player instanceof Player) {
      if (msg[0] == "!" && !this.inPlay && player.admin == true) {
        if (msg.slice(0, 5) == "!stop") {
          this.startClock.stop();
          player.send("Countdown stopped", undefined, Colors.green);
        } else if (msg.slice(0, 6) == "!start") {
          if (this._registeredPlayerCount >= this._minPlayerCount) {
            this.start();
          } else {
            player.send("Not enough players to start game", Colors.brightRed);
          }
        } else if (msg.slice(0, 7) == "!resume") {
          this.startClock.start();
          player.send("Countdown resumed", undefined, Colors.green);
        } else if (msg.slice(0, 8) == "!restart") {
          this.startClock.restart();
          player.send("Countdown restarted", undefined, Colors.green);
        } else if (msg.slice(0, 5) == "!time") {
          player.send(this.startClock.time.toString());
        } else if (msg.slice(0, 5) == "!hold") {
          player.send("The vote to start has been halted.", undefined, Colors.green);
          this.holdVote = true;
        } else if (msg.slice(0, 8) == "!release") {
          player.send("The vote to start has been resumed", undefined, Colors.green);
          this.holdVote = false;
        } else if (msg.slice(0, 5) == "!help") {
          player.send("!stop, !start, !resume, !restart, !time, !hold, !release, !help", undefined, Colors.green);
        }
      }
    }
  }
}
/**
 * 
 * Adds 'muted' and 'deafened' properties to Player so that it can be used in a MessageRoom.      
 * Each MessageRoom will have a different MessageRoomMember for the same Player.
 */
export class MessageRoomMember extends Player {
  private _muted: boolean = false;
  private _deafened: boolean = false;
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
  private _members: Array<MessageRoomMember> = [];
  public getMemberById(id: string): MessageRoomMember | undefined {
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
  public receive(sender: MessageRoomMember | string, msg: string, textColor?: string, backgroundColor?: string) {
    //if message room member passed in
    if (sender instanceof MessageRoomMember) {
      if (!sender.muted) {
        for (var i = 0; i < this._members.length; i++) {
          if (!this._members[i].deafened) {
            this._members[i].send(msg, textColor, backgroundColor);
          }
        }
      }
    } else {
      //if id passed in, find the sender within the message room
      let messageRoomSender = this.getMemberById(sender);
      if (messageRoomSender instanceof MessageRoomMember) {
        if (!messageRoomSender.muted) {
          for (var i = 0; i < this._members.length; i++) {
            if (!this._members[i].deafened) {
              this._members[i].send(msg, textColor, backgroundColor);
            }
          }
        }
      }
    }
  }
  public broadcast(msg: string, textColor?: string, backgroundColor?: string) {
    for (var i = 0; i < this._members.length; i++) {
      if (!this._members[i].deafened) {
        this._members[i].send(msg, textColor, backgroundColor);
      }
    }
  }
  public addPlayer(player: Player) {
    this._members.push(new MessageRoomMember(player.socket));
  }
  public mute(id: string) {
    let member = this.getMemberById(id);
    if (member instanceof MessageRoomMember) {
      member.mute();
    }
  }
  public deafen(id: string) {
    let member = this.getMemberById(id);
    if (member instanceof MessageRoomMember) {
      member.deafen();
    }
  }
  public unmute(id: string) {
    let member = this.getMemberById(id);
    if (member instanceof MessageRoomMember) {
      member.unmute();
    }
  }
  public undeafen(id: string) {
    let member = this.getMemberById(id);
    if (member instanceof MessageRoomMember) {
      member.undeafen();
    }
  }
  public muteAll() {
    this._members.forEach(member => {
      member.mute();
    });
  }
  public deafenAll() {
    this._members.forEach(member => {
      member.deafen();
    });
  }
  public unmuteAll() {
    this._members.forEach(member => {
      member.unmute();
    });
  }
  public undeafenAll() {
    this._members.forEach(member => {
      member.undeafen();
    });
  }
}
