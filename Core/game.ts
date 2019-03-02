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
import { Server } from "./server";
import { User, Message } from "./user";
import {
  Colors,
  NameColorPair,
  Stopwatch,
  UserColorArray,
  Utils,
} from "./utils";
import { DEBUGMODE } from "../app";

export abstract class Game {
  protected endChat: MessageRoom = new MessageRoom();
  protected endTime: number = 30000;
  //the list of message rooms, used for communication between players,
  //adds the ability to mute players etc.
  private _messageRooms: Array<MessageRoom> = [];
  private _users: Array<User> = [];
  private _registeredPlayerCount: number = 0;
  //min and max number of players - controls when the game chooses to start
  private readonly _minPlayerCount: number;
  private readonly _maxPlayerCount: number;
  //true until the point where players are all kicked (so includes end chat phase)
  private _inPlay: boolean = false;
  //a reference to the parent server
  private readonly _server: Server;
  private readonly startClock: Stopwatch = new Stopwatch();
  //time given to players to join the game once min is exceeded
  private _startWait = 30000;
  private holdVote: boolean = false;
  //used to hand out username colors to players
  private colorPool = UserColorArray.slice();
  //what the game mode is
  private _gameType: string;
  private _resetStartTime: boolean = false;
  private _inEndChat: boolean = false;
  //the name the game creator gave the game
  private _name: string;
  private _uid: string;
  //if no one is in the game for this long, the game is closed by the server
  private idleTime: number = 60000 * 5;
  //timer that keeps track of game inactivity
  private idleTimer: Stopwatch = new Stopwatch();
  //game data printed when the game starts
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
    //debug mode will start game faster
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
    //run update functions periodically
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
  public get users() {
    return this._users;
  }
  //update is supplied by concrete child class
  protected update() {}
  //returns array of usernames and their colors, to put in the lobby chat
  get usernameColorPairs(): Array<NameColorPair> {
    let usernameColorPairs = [];
    for (let i = 0; i < this._users.length; i++) {
      usernameColorPairs.push(<NameColorPair>{
        username: this._users[i].username,
        color: this._users[i].color,
      });
    }
    return usernameColorPairs;
  }
  public get gameType() {
    return this._gameType;
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
  //returns how many more players are needed to start
  get minimumPlayersNeeded() {
    if (this._inPlay) {
      return 0;
    } else {
      return this._minPlayerCount - this._registeredPlayerCount;
    }
  }
  //returns how many players are wanted
  get playersWanted() {
    if (this._inPlay) {
      return 0;
    } else {
      return this._maxPlayerCount - this._registeredPlayerCount;
    }
  }
  public getUser(id: string): User | undefined {
    for (let i = 0; i < this._users.length; i++) {
      if (this._users[i].id == id) {
        return this._users[i];
      }
    }
    console.log("Error: Game.getUser: No user found with given id");
    return undefined;
  }
  public isUser(id: string): boolean {
    for (let i = 0; i < this._users.length; i++) {
      if (this._users[i].id == id) {
        return true;
      }
    }
    return false;
  }
  public setAllTime(time: number, warnTime: number) {
    for (let i = 0; i < this._users.length; i++) {
      this._users[i].setTime(time, warnTime);
    }
  }
  private setAllTitle(title: string) {
    for (let i = 0; i < this._users.length; i++) {
      this._users[i].title = title;
    }
  }
  public markAsDead(name: string) {
    for (let i = 0; i < this.users.length; i++) {
      this.users[i].markAsDead(name);
    }
  }
  protected cancelVoteSelection() {
    for (let i = 0; i < this.users.length; i++) {
      this.users[i].cancelVoteEffect();
    }
  }
  private pregameLobbyUpdate() {
    if (!this.inPlay) {
      //remove inactive games
      if (this._users.length != 0) {
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
          for (let i = 0; i < this._users.length; i++) {
            if (this._users[i].startVote) {
              voteCount++;
            }
          }
          if (voteCount >= this._users.length / 2) {
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
          this.setAllTitle("OpenWerewolf (" + this._users.length + ")");
        }
      }
    }
  }
  public addUser(user: User) {
    this.endChat.addUser(user);
    this.endChat.muteAll();
    for (let i = 0; i < this._users.length; i++) {
      this._users[i].sound("NEWPLAYER");
    }
    user.color = this.colorPool[0];
    user.headerSend([
      { text: "Welcome, ", color: Colors.white },
      { text: user.username, color: user.color },
    ]);
    this.colorPool.splice(0, 1);
    user.startVote = false;
    this._users.push(user);
    this.setAllTitle("OpenWerewolf (" + this._users.length + ")");
    this._registeredPlayerCount++;
    this._server.listPlayerInLobby(user.username, user.color, this);

    //If the number of players is between minimum and maximum count, inform them of the wait remaining before game starts
    if (
      this._users.length > this._minPlayerCount &&
      this._users.length < this._maxPlayerCount
    ) {
      user.send(
        "The game will start in " +
          Math.floor(
            (this.startWait - this.startClock.time) / 1000,
          ).toString() +
          " seconds",
      );
      user.send('Type "/start" to start the game immediately');
      user.setTime(this.startWait - this.startClock.time, 10000);
    }
  }
  public broadcast(
    msg: string | Message,
    textColor?: Colors,
    backgroundColor?: Colors,
  ) {
    for (let i = 0; i < this._users.length; i++) {
      this._users[i].send(msg, textColor, backgroundColor);
    }
  }
  public abstract receive(user: User, msg: string): void;
  public disconnect(user: User): void {
    this.lineThroughPlayer(user.username, "grey");
  }
  //remove a user from the game
  public kick(user: User) {
    for (let i = 0; i < this._messageRooms.length; i++) {
      this._messageRooms[i].removeUser(user);
      this.endChat.removeUser(user);
    }
    for (let i = 0; i < this._users.length; i++) {
      this._users[i].sound("LOSTPLAYER");
    }
    this._server.unlistPlayerInLobby(user.username, this);
    let index = this._users.indexOf(user);
    if (index != -1) {
      this._registeredPlayerCount--;
      this._users.splice(index, 1);
    }
    this.colorPool.push(user.color);
    this.setAllTitle("OpenWerewolf (" + this._users.length + ")");
    user.title = "OpenWerewolf";
    this.broadcast(user.username + " has disconnected");
  }
  protected headerBroadcast(array: Array<{ text: string; color: Colors }>) {
    for (let i = 0; i < this._users.length; i++) {
      this._users[i].headerSend(array);
    }
  }
  public abstract resendData(user: User): void;
  protected beforeStart() {
    for (let i = 0; i < this._users.length; i++) {
      this._users[i].sound("NEWGAME");
      this._users[i].emit("newGame");
    }
    this._inPlay = true;
    this._server.markGameStatusInLobby(this, "IN PLAY");
    this.broadcast("*** NEW GAME ***", Colors.brightGreen);
    this.broadcast(this.title + " by " + this.author);
    this.broadcast("License: " + this.license);
    this.broadcast(
      "You can create your own games! Take a look at the github repository.",
    );
    this.headerBroadcast([
      { text: "*** NEW GAME ***", color: Colors.brightGreen },
    ]);
    //send all players to user
    for (let user of this.users) {
      user.emit("allPlayers", this.users.map(elem => elem.username));
    }
  }
  protected afterEnd() {
    //Clear all message rooms of players
    for (let i = 0; i < this._messageRooms.length; i++) {
      for (let j = 0; j < this._users.length; j++) {
        console.log("active " + this._users[j].username);
        this._messageRooms[i].removeUser(this._users[j]);
      }
    }
    this._inEndChat = true;
    this.endChat.unmuteAll();
    for (let i = 0; i < this._users.length; i++) {
      this._users[i].emit("endChat");
    }
    this.setAllTime(this.endTime, 10000);
    setTimeout(() => {
      this.setAllTitle("OpenWerewolf");
      //emit event that causes players to restart the client
      for (let i = 0; i < this._users.length; i++) {
        this._users[i].emit("restart");
      }
      this._inPlay = false;
      for (let i = 0; i < this._users.length; i++) {
        this._users[i].resetAfterGame();
        this.endChat.removeUser(this._users[i]);
      }
      this._users = [];
      this._registeredPlayerCount = 0;
      this.colorPool = UserColorArray.slice();
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
    for (let i = 0; i < this._users.length; i++) {
      if (i != 0) {
        playersString += ", ";
      }
      playersString += this._users[i].username;
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
    for (let i = 0; i < this._users.length; i++) {
      this._users[i].lineThroughUser(username, color);
    }
  }
  //to be overridden in child classes as necessary
  public customAdminReceive(user: User, msg: string): void {}
  //generic admin commands
  public adminReceive(user: User, msg: string): void {
    if (user.admin == true && msg[0] == "!") {
      if (!this.inPlay) {
        if (Utils.isCommand(msg, "!stop")) {
          this.startClock.stop();
          user.send("Countdown stopped", undefined, Colors.green);
        } else if (Utils.isCommand(msg, "!start")) {
          if (this._registeredPlayerCount >= this._minPlayerCount) {
            this.start();
          } else {
            user.send("Not enough players to start game", Colors.brightRed);
          }
        } else if (Utils.isCommand(msg, "!resume")) {
          this.startClock.start();
          user.send("Countdown resumed", undefined, Colors.green);
        } else if (Utils.isCommand(msg, "!restart")) {
          this.startClock.restart();
          user.send("Countdown restarted", undefined, Colors.green);
        } else if (Utils.isCommand(msg, "!time")) {
          user.send(this.startClock.time.toString());
        } else if (Utils.isCommand(msg, "!hold")) {
          user.send(
            "The vote to start has been halted.",
            undefined,
            Colors.green,
          );
          this.holdVote = true;
        } else if (Utils.isCommand(msg, "!release")) {
          user.send(
            "The vote to start has been resumed",
            undefined,
            Colors.green,
          );
          this.holdVote = false;
        } else if (Utils.isCommand(msg, "!help")) {
          user.send(
            "!stop, !start, !resume, !restart, !time, !hold, !release, !yell, !help",
            undefined,
            Colors.green,
          );
          user.send(
            "Use !gamehelp for game-specific commands.",
            undefined,
            Colors.green,
          );
        } else {
          this.customAdminReceive(user, msg);
        }
      }
      if (Utils.isCommand(msg, "!yell")) {
        this.broadcast("ADMIN:" + msg.slice(5), Colors.brightGreen);
      } else {
        this.customAdminReceive(user, msg);
      }
    }
  }
}
/**
 *
 * Adds 'muted' and 'deafened' properties to User so that it can be used in a MessageRoom.
 * Each MessageRoom will have a different MessageRoomMember for the same User.
 */
class MessageRoomMember {
  private _muted: boolean = false;
  private _deafened: boolean = false;
  private _permanentlyMuted: boolean = false;
  private _permanentlyDeafened: boolean = false;
  private _member: User;
  constructor(member: User) {
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
    textColor?: Colors,
    backgroundColor?: Colors,
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
    sender: User,
    msg: string | Message,
    textColor?: Colors,
    backgroundColor?: Colors,
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
    textColor?: Colors,
    backgroundColor?: Colors,
  ) {
    for (let i = 0; i < this._members.length; i++) {
      if (!this._members[i].deafened) {
        this._members[i].send(msg, textColor, backgroundColor);
      }
    }
  }
  public addUser(user: User) {
    this._members.push(new MessageRoomMember(user));
  }
  public removeUser(user: User) {
    let member = this.getMemberById(user.id);
    if (member instanceof MessageRoomMember) {
      let indexOf = this._members.indexOf(member);
      if (indexOf != -1) {
        this._members.splice(indexOf, 1);
      }
    }
  }
  public mute(user: User) {
    let member = this.getMemberById(user.id);
    if (member instanceof MessageRoomMember) {
      member.mute();
    }
  }
  public deafen(user: User) {
    let member = this.getMemberById(user.id);
    if (member instanceof MessageRoomMember) {
      member.deafen();
    }
  }
  public unmute(user: User) {
    let member = this.getMemberById(user.id);
    if (member instanceof MessageRoomMember) {
      member.unmute();
    }
  }
  public undeafen(user: User) {
    let member = this.getMemberById(user.id);
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
