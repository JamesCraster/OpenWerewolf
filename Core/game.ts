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
import { Server } from "./server";
import { Player, Message } from "./player";
import {
  Color,
  NameColorPair,
  Stopwatch,
  PlayerColorArray,
  Utils,
} from "./utils";
import { DEBUGMODE } from "../app";

export abstract class Game {
  protected endChat: MessageRoom = new MessageRoom();
  protected endTime: number = 30000;
  private _messageRooms: Array<MessageRoom> = [];
  private _players: Array<Player> = [];
  private _registeredPlayerCount: number = 0;
  private readonly _minPlayerCount: number;
  private readonly _maxPlayerCount: number;
  //true until the point where players are all kicked (so includes end chat phase)
  private _inPlay: boolean = false;
  private readonly _server: Server;
  private readonly startClock: Stopwatch = new Stopwatch();
  private _startWait = 30000;
  private holdVote: boolean = false;
  private colorPool = PlayerColorArray.slice();
  private _gameType: string;
  private _resetStartTime: boolean = false;
  private _inEndChat: boolean = false;
  private _name: string;
  private _uid: string;
  private idleTime: number = 60000 * 5;
  private idleTimer: Stopwatch = new Stopwatch();
  private readonly author: string;
  private readonly title: string;
  private readonly license: string;

  public constructor(
    server: Server,
    minPlayerCount: number,
    maxPlayerCount: number,
    gameType: string,
    name: string,
    uid: string,
    title: string,
    author: string,
    license: string,
  ) {
    if (DEBUGMODE) {
      this._startWait = 10000;
    }
    this._uid = uid;
    this._server = server;
    this._minPlayerCount = minPlayerCount;
    this._maxPlayerCount = maxPlayerCount;
    this._gameType = gameType;
    this._name = name;
    this.title = title;
    this.author = author;
    this.license = license;
    setInterval(this.pregameLobbyUpdate.bind(this), 500);
    setInterval(this.update.bind(this), 500);
  }
  public get name() {
    return this._name;
  }
  public get inEndChat() {
    return this._inEndChat;
  }
  public get uid() {
    return this._uid;
  }
  get playerNameColorPairs(): Array<NameColorPair> {
    let playerNameColorPairs = [];
    for (let i = 0; i < this._players.length; i++) {
      playerNameColorPairs.push(<NameColorPair>{
        username: this._players[i].username,
        color: this._players[i].color,
      });
    }
    return playerNameColorPairs;
  }
  public get gameType() {
    return this._gameType;
  }
  protected get players() {
    return this._players;
  }
  get startWait() {
    return this._startWait;
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
    for (let i = 0; i < this._players.length; i++) {
      if (this._players[i].id == id) {
        return this._players[i];
      }
    }
    console.log("Error: Game.getPlayer: No player found with given id");
    return undefined;
  }
  public isPlayer(id: string): boolean {
    for (let i = 0; i < this._players.length; i++) {
      if (this._players[i].id == id) {
        return true;
      }
    }
    return false;
  }
  public setAllTime(time: number, warnTime: number) {
    for (let i = 0; i < this._players.length; i++) {
      this._players[i].setTime(time, warnTime);
    }
  }
  private setAllTitle(title: string) {
    for (let i = 0; i < this._players.length; i++) {
      this._players[i].title = title;
    }
  }
  public markAsDead(name: string) {
    for (let i = 0; i < this.players.length; i++) {
      this.players[i].markAsDead(name);
    }
  }
  protected cancelVoteSelection() {
    for (let i = 0; i < this.players.length; i++) {
      this.players[i].cancelVoteEffect();
    }
  }
  private pregameLobbyUpdate() {
    if (!this.inPlay) {
      if (this._players.length != 0) {
        this.idleTimer.restart();
        this.idleTimer.stop();
      } else if (this.idleTimer.time > this.idleTime) {
        this._server.removeGame(this);
      } else {
        this.idleTimer.start();
      }
      //if have max number of players, start the game immediately
      if (this._registeredPlayerCount >= this._maxPlayerCount) {
        this.start();
        this.setAllTitle("OpenWerewolf:In play");
        //if have minimum number of players
      } else if (this._registeredPlayerCount >= this._minPlayerCount) {
        this._resetStartTime = true;
        //if startClock has been ticking for startWait time, start:
        if (this.startClock.time > this.startWait) {
          this.start();
          this.setAllTitle("OpenWerewolf: In play");
          //if a majority has typed /start, start:
        } else if (!this.holdVote) {
          let voteCount = 0;
          for (let i = 0; i < this._players.length; i++) {
            if (this._players[i].startVote) {
              voteCount++;
            }
          }
          if (voteCount >= this._players.length / 2) {
            this.start();
            this.setAllTitle("OpenWerewolf: In play");
          } else {
            this.setAllTitle("Starting...");
          }
        }
        //TODO: if everyone has typed /wait, wait a further 30 seconds up to a limit of 3 minutes:
      } else {
        this.startClock.restart();
        this.startClock.start();
        if (this._resetStartTime) {
          this.setAllTime(0, 0);
          console.log("restarted");
          this._resetStartTime = false;
          this.setAllTitle("OpenWerewolf (" + this._players.length + ")");
        }
      }
    }
  }
  protected abstract update(): void;
  public addPlayer(player: Player) {
    this.endChat.addPlayer(player);
    this.endChat.muteAll();
    for (let i = 0; i < this._players.length; i++) {
      this._players[i].sound("NEWPLAYER");
    }
    player.color = this.colorPool[0];
    player.headerSend([
      { text: "Welcome, ", color: Color.white },
      { text: player.username, color: player.color },
    ]);
    this.colorPool.splice(0, 1);
    player.startVote = false;
    this._players.push(player);
    this.setAllTitle("OpenWerewolf (" + this._players.length + ")");
    this._registeredPlayerCount++;
    this._server.listPlayerInLobby(player.username, player.color, this);

    //If the number of players is between minimum and maximum count, inform them of the wait remaining before game starts
    if (
      this._players.length > this._minPlayerCount &&
      this._players.length < this._maxPlayerCount
    ) {
      player.send(
        "The game will start in " +
          Math.floor(
            (this.startWait - this.startClock.time) / 1000,
          ).toString() +
          " seconds",
      );
      player.send('Type "/start" to start the game immediately');
      player.setTime(this.startWait - this.startClock.time, 10000);
    }
  }
  public broadcast(
    msg: string | Message,
    textColor?: Color,
    backgroundColor?: Color,
  ) {
    for (let i = 0; i < this._players.length; i++) {
      this._players[i].send(msg, textColor, backgroundColor);
    }
  }
  public abstract receive(player: Player, msg: string): void;
  public disconnect(player: Player): void {
    this.lineThroughPlayer(player.username, "grey");
  }
  public kick(player: Player) {
    //this function fails
    for (let i = 0; i < this._messageRooms.length; i++) {
      this._messageRooms[i].removePlayer(player);
      this.endChat.removePlayer(player);
    }
    for (let i = 0; i < this._players.length; i++) {
      this._players[i].sound("LOSTPLAYER");
    }
    this._server.unlistPlayerInLobby(player.username, this);
    let index = this._players.indexOf(player);
    if (index != -1) {
      this._registeredPlayerCount--;
      this._players.splice(index, 1);
    }
    this.colorPool.push(player.color);
    this.setAllTitle("OpenWerewolf (" + this._players.length + ")");
    player.title = "OpenWerewolf";
    this.broadcast(player.username + " has disconnected");
  }
  protected headerBroadcast(array: Array<{ text: string; color: Color }>) {
    for (let i = 0; i < this._players.length; i++) {
      this._players[i].headerSend(array);
    }
  }
  protected beforeStart() {
    for (let i = 0; i < this._players.length; i++) {
      this._players[i].sound("NEWGAME");
      this._players[i].emit("newGame");
    }
    this._inPlay = true;
    this._server.markGameStatusInLobby(this, "IN PLAY");
    this.broadcast("*** NEW GAME ***", Color.brightGreen);
    this.broadcast(this.title + " by " + this.author);
    this.broadcast("License: " + this.license);
    this.broadcast(
      "You can create your own games! Take a look at the github repository.",
    );
    this.headerBroadcast([
      { text: "*** NEW GAME ***", color: Color.brightGreen },
    ]);
  }
  protected afterEnd() {
    //Clear all message rooms of players
    for (let i = 0; i < this._messageRooms.length; i++) {
      for (let j = 0; j < this._players.length; j++) {
        console.log("active " + this._players[j].username);
        this._messageRooms[i].removePlayer(this._players[j]);
      }
    }
    this._inEndChat = true;
    this.endChat.unmuteAll();
    for (let i = 0; i < this._players.length; i++) {
      this._players[i].emit("endChat");
    }
    this.setAllTime(this.endTime, 10000);
    setTimeout(() => {
      this.setAllTitle("OpenWerewolf");
      //emit event that causes players to restart the client
      for (let i = 0; i < this._players.length; i++) {
        this._players[i].emit("restart");
      }
      this._inPlay = false;
      for (let i = 0; i < this._players.length; i++) {
        this._players[i].resetAfterGame();
        this.endChat.removePlayer(this._players[i]);
      }
      this._players = [];
      this._registeredPlayerCount = 0;
      this.colorPool = PlayerColorArray.slice();
      this._server.markGameStatusInLobby(this, "OPEN");
      this._inEndChat = false;
      this._server.removeGame(this);
    }, this.endTime);
  }
  protected addMessageRoom(room: MessageRoom) {
    this._messageRooms.push(room);
  }
  protected abstract start(): void;
  protected abstract end(): void;
  protected broadcastPlayerList() {
    let playersString = "";
    for (let i = 0; i < this._players.length; i++) {
      if (i != 0) {
        playersString += ", ";
      }
      playersString += this._players[i].username;
    }
    this.broadcast("Players: " + playersString + ".");
  }
  protected broadcastRoleList(list: Array<string>) {
    let string = "";
    for (let i = 0; i < list.length; i++) {
      if (i != 0) {
        string += ", ";
      }
      string += list[i];
    }
    this.broadcast("Roles (in order of when they act): " + string + ".");
  }
  public lineThroughPlayer(username: string, color: string) {
    for (let i = 0; i < this._players.length; i++) {
      this._players[i].lineThroughPlayer(username, color);
    }
  }
  //to be overridden in child classes as necessary
  public customAdminReceive(player: Player, msg: string): void {}
  //admin commands
  public adminReceive(player: Player, msg: string): void {
    if (player.admin == true && msg[0] == "!") {
      if (!this.inPlay) {
        if (Utils.isCommand(msg, "!stop")) {
          this.startClock.stop();
          player.send("Countdown stopped", undefined, Color.green);
        } else if (Utils.isCommand(msg, "!start")) {
          if (this._registeredPlayerCount >= this._minPlayerCount) {
            this.start();
          } else {
            player.send("Not enough players to start game", Color.brightRed);
          }
        } else if (Utils.isCommand(msg, "!resume")) {
          this.startClock.start();
          player.send("Countdown resumed", undefined, Color.green);
        } else if (Utils.isCommand(msg, "!restart")) {
          this.startClock.restart();
          player.send("Countdown restarted", undefined, Color.green);
        } else if (Utils.isCommand(msg, "!time")) {
          player.send(this.startClock.time.toString());
        } else if (Utils.isCommand(msg, "!hold")) {
          player.send(
            "The vote to start has been halted.",
            undefined,
            Color.green,
          );
          this.holdVote = true;
        } else if (Utils.isCommand(msg, "!release")) {
          player.send(
            "The vote to start has been resumed",
            undefined,
            Color.green,
          );
          this.holdVote = false;
        } else if (Utils.isCommand(msg, "!help")) {
          player.send(
            "!stop, !start, !resume, !restart, !time, !hold, !release, !yell, !help",
            undefined,
            Color.green,
          );
          player.send(
            "Use !gamehelp for game-specific commands.",
            undefined,
            Color.green,
          );
        } else {
          this.customAdminReceive(player, msg);
        }
      } else {
        if (Utils.isCommand(msg, "!yell")) {
          this.broadcast("ADMIN:" + msg.slice(5), Color.brightGreen);
        } else {
          this.customAdminReceive(player, msg);
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
class MessageRoomMember {
  private _muted: boolean = false;
  private _deafened: boolean = false;
  private _permanentlyMuted: boolean = false;
  private _permanentlyDeafened: boolean = false;
  private _member: Player;
  constructor(member: Player) {
    this._member = member;
  }
  public permanentlyMute() {
    this._permanentlyMuted = true;
    this._muted = true;
  }
  public permanentlyDeafen() {
    this._permanentlyDeafened = true;
    this._deafened = true;
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
    if (!this._permanentlyMuted) {
      this._muted = false;
    }
  }
  public deafen() {
    this._deafened = true;
  }
  public undeafen() {
    if (!this._permanentlyDeafened) {
      this._deafened = false;
    }
  }
  get id() {
    return this._member.id;
  }
  public send(
    message: string | Message,
    textColor?: Color,
    backgroundColor?: Color,
  ): void {
    this._member.send(message, textColor, backgroundColor);
  }
}
export class MessageRoom {
  private _members: Array<MessageRoomMember> = [];
  public getMemberById(id: string): MessageRoomMember | undefined {
    for (let i = 0; i < this._members.length; i++) {
      if (this._members[i].id == id) {
        return this._members[i];
      }
    }
    console.log(
      "Error: MessageRoom.getMemberById: No message room member found with given id",
    );
    return undefined;
  }
  public receive(
    sender: Player,
    msg: string | Message,
    textColor?: Color,
    backgroundColor?: Color,
  ) {
    //if id passed in, find the sender within the message room
    let messageRoomSender = this.getMemberById(sender.id);
    if (messageRoomSender instanceof MessageRoomMember) {
      if (!messageRoomSender.muted) {
        for (let i = 0; i < this._members.length; i++) {
          if (!this._members[i].deafened) {
            this._members[i].send(msg, textColor, backgroundColor);
          }
        }
      }
    }
  }
  public broadcast(
    msg: string | Message,
    textColor?: Color,
    backgroundColor?: Color,
  ) {
    for (let i = 0; i < this._members.length; i++) {
      if (!this._members[i].deafened) {
        this._members[i].send(msg, textColor, backgroundColor);
      }
    }
  }
  public addPlayer(player: Player) {
    this._members.push(new MessageRoomMember(player));
  }
  public removePlayer(player: Player) {
    let member = this.getMemberById(player.id);
    if (member instanceof MessageRoomMember) {
      let indexOf = this._members.indexOf(member);
      if (indexOf != -1) {
        this._members.splice(indexOf, 1);
      }
    }
  }
  public mute(player: Player) {
    let member = this.getMemberById(player.id);
    if (member instanceof MessageRoomMember) {
      member.mute();
    }
  }
  public deafen(player: Player) {
    let member = this.getMemberById(player.id);
    if (member instanceof MessageRoomMember) {
      member.deafen();
    }
  }
  public unmute(player: Player) {
    let member = this.getMemberById(player.id);
    if (member instanceof MessageRoomMember) {
      member.unmute();
    }
  }
  public undeafen(player: Player) {
    let member = this.getMemberById(player.id);
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
