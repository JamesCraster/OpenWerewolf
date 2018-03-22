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

import { Server } from "./core";
import { Socket } from "./node_modules/@types/socket.io";
import { OneNight } from "./Games/oneNight";

var express = require("express");
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);

//create a new server
var server = new Server();
server.addGame(new OneNight());
//serve static content
app.use(express.static("Client"));
app.get("/", function(req: any, res: any) {
  res.sendFile(__dirname + "/client.html");
});

//handle requests
io.on("connection", function(socket: Socket) {
  let time = 0;
  server.addPlayer(socket);
  socket.on("message", function(msg: string) {
    if (Date.now() - time < 500) {
      socket.emit("message", "Please do not spam the chat");
      time = Date.now();
    } else {
      time = Date.now();
      server.receive(socket.id, msg);
    }
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
