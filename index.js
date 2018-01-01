 /* The following copyright notice applies to all the files in this repository:
 
    OpenWerewolf, an online one-night mafia game.
    Copyright (C) 2017 James Vaughan Craster  

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, version 3 of the License.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
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
  static verifyUsername(username){
    var letters = /^[A-Za-z]+$/;
    return(username.length <= 10 && letters.test(username));
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
    if(Server.verifyUsername(msg)){
      player.register();
      player.setUsername(msg);
      this._registeredPlayerCount ++;
      if(this.playersNeeded > 0){
        Server.broadcast(player.username + ' has joined the game. Game will begin when '+
         this.playersNeeded.toString() + " more players have joined." , "bold","green"); 	
      }else{
        Server.broadcast(player.username + ' has joined the game. The game begins now.', "bold","green");
      }
    }else{
      player.send('Invalid username: must be only letters and less than 10 characters.', "bold","black");
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
  broadcast(msg){

  }
  receive(player,msg){

  }
}
var server = new Server();
io.on('connection', function(socket){
  server.addPlayer(new Player(socket));
  socket.on('message', function(msg){
    server.receive(socket.id, msg);
  });
});

var port = process.env.PORT || 8080;
http.listen(port, function(){
  console.log('Port is:' + port);
});
