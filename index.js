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
    this._username = "randomuser";
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
  };
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
      if(this.playersNeeded > 0){
        Server.broadcast(player.username + ' has joined the game. Game will begin when '+
         this.playersNeeded.toString() + " more players have joined." , "bold","green"); 	
      }else{
        Server.broadcast(player.username + ' has joined the game. The game begins now.', "bold","green");
      }
    }
  }
  receive(id,msg){
    var player = this.getPlayer(id);
    if(!player.registered){
      this.register(player,msg);
    }else{
      Server.broadcast(player.username + ': ' + msg, "black");
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
    if (index !== -1) {
        this._players.splice(index, 1);
        Server.broadcast(player.username + " has disconnected", "bold");
        if(player.registered && this._registeredPlayerCount > 0){
          this._registeredPlayerCount--;
        }
    }
  }
}

class MessageRoom{
  constructor(){
    this._players = [];
  }
  getPlayer(id){
    for(var i = 0; i < this._players.length; i++){
      if(this._players[i].id == id){
        return this._players[i];
      }
    }
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
