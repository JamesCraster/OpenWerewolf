/* 
    OpenWerewolf, an online one-night mafia game.
    Copyright (C) 2017 James Vaughan Craster  

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
*/

"use strict";
import {Socket} from "./node_modules/@types/socket.io"
//import statements
var express = require("express");
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);

//serve static content
app.use(express.static("Client"));
app.get("/", function(req: any, res: any) {
  res.sendFile(__dirname + "/client.html");
});

class Player {
  //true if the player has a username
  private _registered: boolean = false;
  private _socket: Socket;
  private _inGame: boolean = false;
  private _username: string = "randomuser";
  //object that can be used to flexibly add data to player for game purposes
  private _data: Object = new Object();
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
  get data() {
    return this._data;
  }
  public setData(data: Object) {
    this._data = data;
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
  //send an event to the player
  public emit(event: string) {
    this._socket.emit(event);
  }
  //send message to this player and only this player
  public send(msg: string) {
    this._socket.emit("message", msg);
  }
  get socket(){
    return this._socket;
  }
}

class Server {
  private _players: Array<Player> = [];
  private _games: Array<Game> = [];
  private _registeredPlayerCount: number = 0;
  public constructor() {
    this._registeredPlayerCount = 0;
    this._games = [];
    this._games.push(new Game());
    this._games.push(new Game());
    //call joinGame() every 50 ms to join waiting players to games that need them
    setInterval(this.joinGame.bind(this), 50);
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
    return true;
  }
  //send message to all players on the server
  private static broadcast(msg: string) {
    if (msg.trim() != "") {
      io.emit("message", msg);
    }
  }
  public addPlayer(player: Player) {
    this._players.push(player);
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
        if (msg.trim() != "") {
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
  public kick(id: string): void {
    var player = this.getPlayer(id);
    if (player instanceof Player) {
      var index = this._players.indexOf(player);
      if (index !== -1) {
        this._players.splice(index, 1);
        if (player.registered && this._registeredPlayerCount > 0) {
          this._registeredPlayerCount--;
          Server.broadcast(
            player.username +
              " has disconnected. Game will begin when more players have joined."
          );
        }
      }
    } else {
      console.log(
        "Error: Server.kick: tried to kick player " +
          "id" +
          " but that player does not exist"
      );
    }
  }
}
class Game {
  private _players: Array<Player> = [];
  private _registeredPlayerCount: number = 0;
  private _minPlayerCount: number = 5;
  private messageRoom: MessageRoom = new MessageRoom();
  private _inPlay: boolean = false;

  public constructor() {}
  get playersNeeded() {
    if (this._inPlay) {
      return 0;
    } else {
      return this._minPlayerCount - this._registeredPlayerCount;
    }
  }
  public addPlayer(player: Player) {
    this._players.push(player);
    this._registeredPlayerCount++;
    this.messageRoom.addPlayer(player);
  }
  public broadcast(msg: string) {
    for (var i = 0; i < this._players.length; i++) {
      this._players[i].send(msg);
    }
  }
  public receive(id: string, msg: string) {
    //this.broadcast(msg);
    this.messageRoom.broadcast(id, msg);
  }
}
class MessageRoomMember extends Player {
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
class MessageRoom {
  public _members: Array<MessageRoomMember> = [];
  constructor() {}
  getMemberById(id: string): MessageRoomMember | undefined {
    console.log(typeof id);
    for (var i = 0; i < this._members.length; i++) {
      console.log("loop runs");
      if (this._members[i].id == id) {
        console.log("returns");
        console.log(typeof this._members[i]);
        console.log(this._members[i] instanceof MessageRoomMember);
        console.log("***");
        return this._members[i];
      }
    }
    console.log(
      "Error: MessageRoom.getMemberById: No message room member found with given id"
    );
    return undefined;
  }
  public broadcast(sender: MessageRoomMember | string,msg: string,game = false) {
    //if message room member passed in
    if (sender instanceof MessageRoomMember) {
      //do not check for muting if sender is the game itself
      if (game) {
        for (var i = 0; i < this._members.length; i++) {
          if (!this._members[i].deafened) {
            this._members[i].send(msg);
          }
        }
      } else if (!sender.muted) {
        for (var i = 0; i < this._members.length; i++) {
          if (!this._members[i].deafened) {
            this._members[i].send(msg);
          }
        }
      }
    } else {
      //if id passed in, find the sender within the message room
      let messageRoomSender = this.getMemberById(sender);
      console.log(messageRoomSender instanceof MessageRoomMember);
      console.log(this._members.length);
      console.log(this._members[0].id);
      console.log(sender);
      console.log(this._members[0].id == sender);
      if (messageRoomSender instanceof MessageRoomMember) {
        console.log(messageRoomSender.muted);
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

var server = new Server();

//handle requests
io.on("connection", function(socket: Socket) {
  server.addPlayer(new Player(socket));
  socket.on("message", function(msg: string) {
    server.receive(socket.id, msg);
  });
  socket.on("disconnect", function() {
    server.kick(socket.id);
  });
});

//listen on port
var port = process.env.PORT || 8080;
http.listen(port, function() {
  console.log("Port is:" + port);
});
