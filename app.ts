/*
  Copyright 2017 James V. Craster
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

import { Server } from "./Core/server";
import { Socket } from "./node_modules/@types/socket.io";
import { OneDay } from "./Games/OneDay/oneDay";
import { Classic } from "./Games/Classic/Classic";
import { Demo } from "./Games/Demo/demo";

process.env.NODE_ENV = 'production';
var express = require("express");
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);
var expressSession = require("express-session");
var RedisStore = require("connect-redis")(expressSession);
var redis = require('redis-server');
const redisServer = new redis(6379);
var sql = require('mysql');
redisServer.open(((err: string) => { }));

var myArgs = process.argv.slice(2);

//create a new server
var server = new Server();
if (myArgs[0] == "debug") {
  server.setDebug();
  console.log("debug mode active");
}

server.addGame(new OneDay(server));
server.addGame(new OneDay(server));
server.addGame(new OneDay(server));
server.addGame(new OneDay(server));
server.addGame(new OneDay(server));

//create a session cookie
var session = expressSession({
  store: new RedisStore({ host: 'localhost', port: 6379 }),
  secret: 'secret',
  resave: false,
  saveUninitialized: true
});

//use session cookie in sockets
io.use(function (socket: any, next: any) {
  session(socket.request, socket.request.res, next);
});

app.use(session);

//serve static content
app.use(express.static("Client"));
app.set('view engine', 'pug');
app.get("/", function (req: any, res: any) {
  let gameNames = [];
  for (let i = 0; i < server.numberOfGames; i++) {
    gameNames.push("Game " + (i + 1).toString());
  }
  //add logic with pug to generate correct lobby
  res.render('index', {
    numberOfGames: server.numberOfGames,
    gameNames: gameNames,
    players: server.playerNameColorPairs,
    gameInPlay: server.inPlayArray,
    gameTypes: server.gameTypes
  });
});

//handle requests
io.on("connection", function (socket: Socket) {
  //set the session unless it is already set
  if (!socket.request.session.socketID) {
    socket.request.session.socketID = socket.id;
    socket.request.session.save();
  }
  let time = 0;
  server.addPlayer(socket, socket.request.session.socketID);
  socket.on("message", function (msg: string) {
    if(typeof msg === 'string'){
      //filter for spam(consecutive messages within 1/2 a second)
      if (Date.now() - time < 500) {
        socket.emit("message", "Please do not spam the chat");
        time = Date.now();
      } else {
        time = Date.now();
        server.receive(socket.id, msg);
      }
    }
  });
  socket.on('leaveGame', function(){
    server.leaveGame(socket.id);
  });
  socket.on("disconnect", function () {
    server.kick(socket.id);
  });
  socket.on("gameClick", function (gameNumber) {
    if (!isNaN(gameNumber)) {
      if (parseInt(gameNumber) != NaN) {
        server.gameClick(socket.id, parseInt(gameNumber));
      }
    }
  });
});

//listen on port
var port = 8081;
http.listen(port, function () {
  console.log("Port is:" + port);
});
