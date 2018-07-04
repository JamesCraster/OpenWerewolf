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
*/

"use strict";

import { Server } from "./core";
import { Socket } from "./node_modules/@types/socket.io";
import { OneDay } from "./Games/OneDay/oneDay";
import { Classic } from "./Games/Classic/Classic";
import { Demo } from "./Games/Demo/demo";

var express = require("express");
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);

//create a session cookie
var session = require("express-session")({
  secret: 'secret',
  resave: false,
  saveUninitialized: true
});

//create a new server
var server = new Server();
server.addGame(new OneDay(server));
server.addGame(new OneDay(server));
server.addGame(new OneDay(server));
server.addGame(new OneDay(server));
server.addGame(new OneDay(server));

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
  res.render('client', {
    numberOfGames: server.numberOfGames,
    gameNames: gameNames,
    players: server.playerNameColorPairs,
    gameInPlay: server.inPlayArray,
    gameTypes: server.gameTypes
  });
});

//handle requests
io.on("connection", function (socket: Socket) {
  if (!socket.request.session.socketID) {
    socket.request.session.socketID = socket.id;
    socket.request.session.save();
  }
  let time = 0;
  server.addPlayer(socket);
  socket.on("message", function (msg: string) {
    if (Date.now() - time < 500) {
      socket.emit("message", "Please do not spam the chat");
      time = Date.now();
    } else {
      time = Date.now();
      server.receive(socket.id, msg);
    }
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
