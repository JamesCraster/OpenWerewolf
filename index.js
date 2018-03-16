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

//import statements
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

//serve static content
app.use(express.static('Client'));
app.get('/', function(req, res){
  res.sendFile(__dirname + '/client.html');
});

class Player{
  constructor(socket){
    this._socket = socket;
    //true if the player has a username
    this._registered = false;
    this._inGame = false;
    this._username = "randomuser";
    //object that can be used to flexibly add data to player for game purposes
    this._data = new Object;
    //index of the game the player is in in the server's 'games' array
    this._game;
  }
  get game(){
    return this._game;
  }
  get id(){
    return this._socket.id;
  }
  get data(){
    return this._data;
  }
  setData(data){
    this._data = data;
  }
  get inGame(){
    return this._inGame;
  }
  get registered(){
    return this._registered;
  }
  register(){
    this._registered = true;
  }
  setUsername(username){
    this._username = username;
  }
  get username(){
    return this._username;
  }
  //send an event to the player
  emit(event){
    this._socket.emit(event);
  }
  //send message to this player and only this player
  send(msg){
    this._socket.emit('message',msg);
  }
}

class Server{
  constructor(){
    this._players = [];
    this._registeredPlayerCount = 0;
    this._games = [];
    this._games.push(new Game());
    this._games.push(new Game());
    //call joinGame() every 50 ms to join waiting players to games that need them
    setInterval(this.joinGame.bind(this),50);
  }
  //join waiting players to games
  joinGame(){
    //for(var i = 0; i < this._players.length; i++){
    this._players.forEach((player) => {
    //if player is registered and waiting to join a game
     if(player.registered && !player.inGame){
      for(var j = 0; j < this._games.length; j++){
        //if game needs a player
        if(this._games[j].playersNeeded > 0){
         this._games[j].addPlayer(player);
         player._inGame = true;
         player._game = j;
         player.send("Hi, " + player.username + "! You have joined Game " + (j+1).toString() + "."); 
         break;
        }
      }
      //otherwise (there must be a better way, instead of spamming the chat full!)
      if(player._inGame == false){
          player.send("All Games are currently full. Games only last 5 minutes, so there should be one available very soon!");
      }
     }
    });
  }
  static cleanUpUsername(username){
    username = username.toLowerCase();
    username = username.replace(/\s/g,'');
    return username;
  }
  validateUsername(player,username){
    var letters = /^[A-Za-z]+$/;
    for(var i = 0; i < this._players.length; i++){
      if(this._players[i].username == username){
        player.send('Invalid username: This username has already been taken by someone', "bold","black");
        return false;
      }
    }
    if(username.length == 0){
      player.send('Invalid username: Cannot be 0 letters long');
      return false;
    }
    if(username.length > 10){
      player.send('Invalid username: Must be no more than 10 letters long');
      return false;
    }
    if(!letters.test(username)){
      player.send('Invalid username: Must only contain letters (no numbers or punctuation)');
      return false;
    }
    return true;
  }
  //send message to all players on the server
  static broadcast(msg){
    if(msg.trim() != ''){
      io.emit('message', msg);
    }
  }
  addPlayer(player){
    this._players.push(player);
  }
  register(player,msg){
    //get rid of spaces in name and make lowercase
    msg = Server.cleanUpUsername(msg);

    if(this.validateUsername(player,msg)){
      player.register();
      player.setUsername(msg);
      this._registeredPlayerCount++;
    }
  }
  receive(id,msg){
    var player = this.getPlayer(id);
    if(player != undefined){
      if(!player.registered){
        this.register(player,msg);
      }else{
        if(msg.trim() != ""){
          this._games[player.game].broadcast(player.username + ': ' + msg, "black");
        }
      }
    }else{
      console.log("Player: " + id.toString() + " is not defined");
    }
  }
  getPlayer(id){
    for(var i = 0; i < this._players.length; i++){
      if(this._players[i].id == id){
        return this._players[i];
      }
    }
    return undefined;
  }
  kick(id){
    var player = this.getPlayer(id);
    var index = this._players.indexOf(player);
    //should be index != undefined
    if (index !== -1) {
        this._players.splice(index, 1);
        if(player.registered && this._registeredPlayerCount > 0){
          this._registeredPlayerCount--;
          Server.broadcast(player.username + " has disconnected. Game will begin when more players have joined.", "bold");
        }
    }
  }
}
class Game{
  constructor(){
    this._players = [];
    this._registeredPlayerCount = 0;
    this._minPlayerCount = 5;
    this.messageRoom = new MessageRoom();
    this._inPlay = false;
  }
  get playersNeeded(){
    if(this._inPlay){
      return 0;
    }else{
      return this._minPlayerCount - this._registeredPlayerCount;
    }
  }
  addPlayer(player){
    this._players.push(player);   
    this._registeredPlayerCount++;
    this.messageRoom.addPlayer(player);
  }
  broadcast(msg){
    for(var i = 0; i < this._players.length; i++){
      this._players[i].send(msg);
    }
  }
}
class MessageRoomMember{
    constructor(player){
        this._player = player;
        this._muted = false;
        this._deafened = false;
    };
    get muted(){
     return this._muted;   
    }
    get deafened(){
     return this._deafened;   
    }
    get player(){
     return this._player;   
    }
    mute(){
      this._muted = true;
    }
    unmute(){
      this._muted = false;
    }
    deafen(){
      this._deafened = true;
    }
    undeafen(){
      this._deafened = false;
    }
}
class MessageRoom{
  constructor(){
    this._members = [];
  }
  getMemberById(id){
    for(var i = 0; i < this._members.length; i++){
      if(this._members[i].id == id){
        return this._members[i];
      }
    }
  } 
  broadcast(sender,msg){
    //do not check for muting if sender is the game itself
    if(sender == "GAME"){
      for(var i = 0; i < this._members.length; i++){
        if(!this._members[i].deafened){
          this._members[i].player.send(msg);
        }
      }
    }else if(!sender.muted){
      for(var i = 0; i < this._members.length; i++){
        if(!this._members[i].deafened){
          this._members[i].player.send(msg);
        }
      }
    }
  }
  addPlayer(player){
    this._members.push(new MessageRoomMember(player));
  }
  mute(id){
    member = this.getMemberById(id);
    member.mute();
  }
  deafen(id){
    member = this.getMemberById(id);
    member.deafen();
  }
  unmute(id){
    member = this.getMemberById(id);
    member.unmute();
  }
  undeafen(id){
    member = this.getMemberById(id);
    member.undeafen();
  }
  muteAll(){
    this._members.forEach((member)=>{
      member.mute();
    });
  }
  deafenAll(){
    this._members.forEach((member)=>{
      member.deafen();
    });
  }
  unmuteAll(){
    this._members.forEach((member)=>{
      member.unmute();
    });
  }
  undeafenAll(){
    this._members.forEach((member)=>{
      member.undeafen();
    });
  }
}


var server = new Server();

//handle requests
io.on('connection', function(socket){
  server.addPlayer(new Player(socket));
  socket.on('message', function(msg){
    server.receive(socket.id, msg);
  });
  socket.on('disconnect', function(){
    server.kick(socket.id);
  });
});

//listen on port
var port = process.env.PORT || 8080;
http.listen(port, function(){
  console.log('Port is:' + port);
});
