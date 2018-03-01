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
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static('Client'));
app.get('/', function(req, res){
  res.sendFile(__dirname + '/client.html');
});

class Player{
  constructor(socket){
    this._socket = socket;
    this._registered = false;
    this._inGame = false;
    this._username = "randomuser";
    this.data = new Object;
    this.game;
  }
  get id(){
    return this._socket.id;
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
  //send message to this player and only this player
  send(msg){
    this._socket.emit('message',msg);
  }
}

class Server{
  constructor(){
    this._players = [];
    this._registeredPlayerCount = 0;
    this._minPlayerCount = 5;
    this.game = new MessageRoom();
    this._games = [];
    this._games.push(new Game());
    this._games.push(new Game());
    setInterval(this.joinGame.bind(this),500);
  }
  joinGame(){
    for(var i = 0; i < this._players.length; i++){
     //if player is waiting to join a game
     if(this._players[i].registered && !this._players[i]._inGame){
      for(var j = 0; j < this._games.length; j++){
        //if game needs a player
        if(this._games[j].playersNeeded > 0){
         this._games[j].addPlayer(this._players[i]);
         this._players[i]._inGame = true;
         this._players[i].game = j;
         this._players[i].send("Hi, " + this._players[i].username + "! You have joined Game " + (j+1).toString() + "."); 
         break;
        }
      }
      //otherwise (there must be a better way, instead of spamming the chat full!)
      if(this._players[i]._inGame == false){
          this._players[i].send("All Games are currently full. Games only last 5 minutes, so there should be one available very soon!");
      }
     }
    }
  }
  static cleanUpUsername(username){
    username = username.toLowerCase();
    username = username.replace(/\s/g,'');
    return username;
  }
  verifyUsername(player,username){
    var letters = /^[A-Za-z]+$/;
    for(var i = 0; i < this._players.length; i++){
      if(this._players[i].username == username){
        player.send('Invalid username: This username has already been taken', "bold","black");
        return false;
      }
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
  //send messages to all players on the server
  static broadcast(msg){
    if(msg.trim() != ''){
      io.emit('message', msg);
    }
  }
  addPlayer(player){
    this._players.push(player);
  }
  get playersNeeded(){
    return this._minPlayerCount - this._registeredPlayerCount;
  }
  register(player,msg){
    //get rid of spaces in name
    msg = Server.cleanUpUsername(msg);
    //validate username 
    if(this.verifyUsername(player,msg)){
      player.register();
      player.setUsername(msg);
      this._registeredPlayerCount++;
      //if(this.playersNeeded > 0){
       // Server.broadcast(player.username + ' has joined the game. Game will begin when '+
       //  this.playersNeeded.toString() + " more players have joined." , "bold","green"); 	
      //}else{
       // Server.broadcast(player.username + ' has joined the game. The game begins now.', "bold","green");
     // }
    //}
    }
  }
  receive(id,msg){
    //account for undefined case
    var player = this.getPlayer(id);
    if(!player.registered){
      this.register(player,msg);
    }else{
      if(msg.trim() != ""){
        this._games[player.game].broadcast(player.username + ': ' + msg, "black");
      }
      //if(msg.trim() != ""){
       // Server.broadcast(player.username + ': ' + msg, "black");
      //}
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
          Server.broadcast(player.username + " has disconnected. Game will begin when " + 
          this.playersNeeded.toString() + " more players have joined.", "bold");
        }
    }
  }
}
class Game{
  constructor(){
    this._players = [];
    this._registeredPlayerCount = 0;
    this._minPlayerCount = 2;
    this.messageRoom = new MessageRoom();
  }
  get playersNeeded(){
    return this._minPlayerCount - this._registeredPlayerCount;
  }
  addPlayer(player){
    this._players.push(player);   
    this._registeredPlayerCount++;
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
  //make this accept only a msg with no sender in addition
  broadcast(sender,msg){
    if(!sender.muted)
        for(var i = 0; i < this._members.length; i++){
          if(!this._members[i].deafened){
              this._members[i].player.send(msg);
          }
        }
  }
  addPlayer(){
      
  }
  mute(id){
      member = this.getMemberById(id);
  }
  deafen(id){
      member = this.getMemberById(id);
  }
  unmute(id){
      member = this.getMemberById(id);
  }
  undeafen(id){
      member = this.getMemberById(id);
  }
  muteAll(){
      
  }
  deafenAll(){
      
  }
  unmuteAll(){
      
  }
  deafenAll(){
      
  }
  
}

var server = new Server();


io.on('connection', function(socket){
  server.addPlayer(new Player(socket));
  socket.on('message', function(msg){
    server.receive(socket.id, msg);
  });
  socket.on('disconnect', function(){
    server.kick(socket.id);
  });
});

var port = process.env.PORT || 8080;
http.listen(port, function(){
  console.log('Port is:' + port);
});
