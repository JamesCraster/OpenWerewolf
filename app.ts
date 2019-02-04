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

//import config from JSON
const fs = require("fs");
const config = JSON.parse(fs.readFileSync("Games/games.json", "utf-8"));
let configGameList: any = [];

//dynamically import game classes and add their constructors to configGameList
for (let i = 0; i < config.games.length; i++) {
  console.log(config.games);
  import(config.games[i].location)
    .then(module => {
      configGameList.push({
        constructor: module[config.games[i].name],
        name: config.games[i].name,
      });
    })
    .catch(e => {
      console.log(
        "Non-critical warning, a game is missing: " + config.games[i].name,
      ); /*console.log(e);*/
    });
}

import { Server } from "./Core/server";
import { Socket } from "./node_modules/@types/socket.io";

const myArgs = process.argv.splice(2);

export const DEBUGMODE = myArgs[0];
//register if app is in debug mode
if (DEBUGMODE == "debug") {
  process.env.NODE_ENV = "development";
} else {
  process.env.NODE_ENV = "production";
}

//register if app is in database mode
let DATABASE: boolean = false;
if (myArgs[0] == "database" || myArgs[1] == "database") {
  console.log("database enabled");
  DATABASE = true;
} else {
  console.log("** DATABASE **");
  console.log(
    'The database is disabled by default because the game is playable without it. Run "node app.js database" to enable the database.',
  );
  console.log("Enabling the database would require mysql to be running.");
}

const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const expressSession = require("express-session");
const RedisStore = require("connect-redis")(expressSession);
const redis = require("redis-server");
const redisServer = new redis(6379);
const grawlix = require("grawlix");
const mysql = require("mysql");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const saltNumber = 10;

//details of your email account go here - this needs to be amended for security reasons
var transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "youremail@gmail.com",
    pass: "yourpassword",
  },
});

let uGameid = 0;
let uPlayerid = 0;

let con: any = undefined;
redisServer.open((err: string) => {});
if (DATABASE) {
  //Details of your MySQL server go here (don't worry, these aren't my production details.)
  con = mysql.createConnection({
    host: "localhost",
    user: "jcraster",
    password: "password",
    database: "OPENWEREWOLF",
  });

  con.connect(function(err: any) {
    if (err) throw err;
    console.log("Connected!");
  });
}
//create a new server
let server = new Server();
if (myArgs[0] == "debug") {
  server.setDebug();
  console.log("debug mode active");
}

//create a session cookie
let session = expressSession({
  store: new RedisStore({ host: "localhost", port: 6379 }),
  secret: "sakhasdjhasdkjhadkjahsd",
  resave: false,
  saveUninitialized: true,
});

//log the player into their account
function loginUser(req: any) {
  req.session.loggedIn = true;
  req.session.username = req.body.username;
  req.session.save(() => {});
}

//use session cookie in sockets
io.use(function(socket: any, next: any) {
  session(socket.request, socket.request.res, next);
});

app.use(express.json());
//serve static content
app.use("/mobile", express.static(__dirname + "/Mobile/build"));
app.use("/static", express.static(__dirname + "/Mobile/build/static"));
app.use("/", express.static(__dirname + "/Client"));
app.use(
  "/semantic/dist/semantic.min.js",
  express.static(__dirname + "/semantic/dist/semantic.min.js"),
);
app.use(
  "/semantic/dist/semantic.min.css",
  express.static(__dirname + "/semantic/dist/semantic.min.css"),
);
app.use(
  "/semantic/dist/themes/default/assets/fonts/icons.woff",
  express.static(
    __dirname + "/semantic/dist/themes/default/assets/fonts/icons.woff",
  ),
);
app.set("view engine", "pug");
app.use(session);
app.get("/imprint", function(req: any, res: any) {
  res.render("imprint");
});
app.get("/about", function(req: any, res: any) {
  res.render("about");
});
app.get("/mobile", function(req: any, res: any) {
  res.render("mobile");
});
app.get("/", function(req: any, res: any) {
  let gameNames = [];
  for (let i = 0; i < server.games.length; i++) {
    gameNames.push(server.games[i].name);
  }
  let uids = [];
  for (let i = 0; i < server.games.length; i++) {
    uids.push(server.games[i].uid);
  }

  //add logic with pug to generate correct lobby
  let gameCheckboxesArray: Array<string> = [];
  for (let i = 0; i < configGameList.length; i++) {
    gameCheckboxesArray.push(configGameList[i].name);
  }
  res.render("index", {
    numberOfGames: server.numberOfGames,
    gameNames: gameNames,
    players: server.usernameColorPairs,
    gameInPlay: server.inPlayArray,
    gameTypes: server.gameTypes,
    loggedIn: req.session.loggedIn,
    username: req.session.username,
    uids: uids,
    gameCheckboxesArray: gameCheckboxesArray,
  });
});
if (DATABASE && con) {
  app.post("/register", function(req: any, res: any) {
    let status = "success";
    //run validation
    let letters = /^[A-Za-z]+$/;
    if (
      typeof req.body.username == "string" ||
      req.body.username instanceof String
    ) {
      if (req.body.username.length > 0 && req.body.username.length <= 10) {
        if (letters.test(req.body.username)) {
          if (!grawlix.isObscene(req.body.username)) {
            let sql =
              "SELECT username FROM USERS where username=" +
              mysql.escape(req.body.username);
            con.query(sql, function(err: any, results: any) {
              if (results.length == 0) {
                if (
                  typeof req.body.email == "string" ||
                  req.body.email instanceof String
                ) {
                  if (
                    req.body.email.length > 0 &&
                    req.body.email.length <= 256
                  ) {
                  } else {
                    status = "Your email must be between 1 and 256 characters";
                  }
                }
                if (
                  typeof req.body.password == "string" ||
                  req.body.email instanceof String
                ) {
                  if (
                    req.body.password.length > 0 &&
                    req.body.password.length <= 256
                  ) {
                    if (
                      typeof req.body.repeatPassword == "string" ||
                      req.body.repeatPassword instanceof String
                    ) {
                      if (req.body.password === req.body.repeatPassword) {
                      } else {
                        status =
                          "Your password and repeated password don't match";
                      }
                    }
                  } else {
                    status =
                      "Your password must be between 1 and 256 characters";
                  }
                }

                if (status == "success") {
                  bcrypt.genSalt(saltNumber, function(err: any, salt: any) {
                    bcrypt.hash(req.body.password, salt, function(
                      err: any,
                      hash: any,
                    ) {
                      let sql =
                        "INSERT INTO USERS VALUES (" +
                        mysql.escape(req.body.username) +
                        "," +
                        mysql.escape(req.body.email) +
                        "," +
                        mysql.escape(hash) +
                        "," +
                        mysql.escape(salt) +
                        ")";
                      con.query(sql, function(err: any, result: any) {
                        if (err) throw err;
                      });
                    });
                  });
                  //log the player into their new account automatically
                  loginUser(req);
                }
                res.send('{ "result":' + JSON.stringify(status) + "}");
              } else {
                status =
                  "This username is already taken. Please change your username";
                res.send('{ "result":' + JSON.stringify(status) + "}");
              }
            });
          } else {
            status =
              "Usernames cannot contain profanity. Please change your username";
          }
        } else {
          status =
            "Usernames can only contain letters (no numbers or punctuation)";
        }
      } else {
        status = "Your username must be between 1 and 10 characters";
      }
    }
    if (status != "success") {
      res.send('{ "result":' + JSON.stringify(status) + "}");
    }
  });
  app.post("/login", function(req: any, res: any) {
    let status = "failure";
    if (
      typeof req.body.username == "string" &&
      typeof req.body.password == "string"
    ) {
      let sql =
        "SELECT encrypted_password FROM USERS WHERE username=" +
        mysql.escape(req.body.username);
      con.query(sql, function(err: any, result: any) {
        if (result.length != 0) {
          bcrypt.compare(
            req.body.password,
            result[0].encrypted_password,
            function(err: any, comparisonResult: any) {
              if (comparisonResult == true) {
                status = "success";
                loginUser(req);
              } else {
                status = "Your username or password is incorrect.";
              }
              res.send('{"result":' + JSON.stringify(status) + "}");
            },
          );
        } else {
          status = "Your username or password is incorrect.";
          res.send('{"result":' + JSON.stringify(status) + "}");
        }
      });
    } else {
      res.send('{"result":' + JSON.stringify(status) + "}");
    }
  });
}
app.post("/logout", function(req: any, res: any) {
  req.session.loggedIn = false;
  req.session.username = "";
  res.send("{}");
});
app.post("/newGame", function(req: any, res: any) {
  let result = "success";
  if (
    typeof req.body.name == "string" &&
    typeof req.body.type == "string" &&
    req.body.name.length > 0 &&
    req.body.name.length < 100
  ) {
    if (grawlix.isObscene(req.body.name)) {
      result = "Game names cannot contain profanity.";
    }
    for (let i = 0; i < server.games.length; i++) {
      if (server.games[i].name == req.body.name) {
        result =
          "This game name is already taken. Please choose a different one.";
      }
    }
    if (result == "success") {
      for (let i = 0; i < config.games.length; i++) {
        if (config.games[i].name == req.body.type) {
          //increase unique game id (used on frontend to distinguish between games)
          uGameid++;
          server.addGame(
            new configGameList[i].constructor(
              server,
              req.body.name,
              uGameid.toString(),
            ),
          );
          break;
        }
      }
    }
  }
  res.send('{"result":' + JSON.stringify(result) + "}");
});
app.post("/forgottenPassword", function(req: any, res: any) {
  if (typeof req.body.username == "string") {
    //find email in the database matching username 'req.body.username'
    let sql =
      "SELECT email FROM USERS WHERE username=" +
      mysql.escape(req.body.username);
    con.query(sql, function(err: any, result: any) {
      if (result.length == 0) {
        res.send('{"result":"Your username is incorrect"}');
      } else {
        console.log('{"result":' + JSON.stringify(result[0].email) + "}");
        res.send('{"result":"success"}');
      }
    });
    //send the corresponding email address a randomly generated validation link:
    //first generate the validation link:
    //then send the email:
  }
});
app.get("*.png", function() {});
app.get("*", function(req: any, res: any) {
  res.render("404");
});

//handle socket requests
io.on("connection", function(socket: Socket) {
  //set the session unless it is already set
  if (!socket.request.session.socketID) {
    socket.request.session.socketID = socket.id;
    socket.request.session.save();
  }
  let time = 0;
  uPlayerid++;
  let thisPlayerId = uPlayerid.toString();
  let oldPlayerId = server.addUser(
    socket,
    socket.request.session.socketID,
    thisPlayerId,
  );

  //if the player is already playing on a different tab, their playerId changes to
  //forward their messages as if they came from the first tab
  if (oldPlayerId != undefined) {
    thisPlayerId = oldPlayerId;
  }
  socket.on("reloadClient", function() {
    server.reloadClient(thisPlayerId);
  });
  socket.on("message", function(msg: string) {
    if (typeof msg === "string") {
      //exclude commands from filtering (they start with a forward slash):
      if (msg[0] === "/") {
        server.receive(thisPlayerId, msg);
      }
      //filter for spam(consecutive messages within 1/2 a second)
      else if (Date.now() - time < 500) {
        socket.emit("message", [{ text: "Please do not spam the chat" }]);
        time = Date.now();
      } else {
        time = Date.now();
        server.receive(thisPlayerId, msg);
      }
    }
  });
  socket.on("leaveGame", function() {
    server.leaveGame(thisPlayerId);
  });
  socket.on("disconnect", function() {
    server.removeSocketFromPlayer(thisPlayerId, socket);
    server.kick(thisPlayerId);
  });
  socket.on("gameClick", function(gameId: string) {
    if (parseInt(gameId) != NaN) {
      server.gameClick(thisPlayerId, gameId);
    }
  });
  socket.on("localGameClick", function(name: string, gameId: string) {
    server.receive(thisPlayerId, name);
    console.log(server.getUser(thisPlayerId));
    console.log(server.getGameById(gameId));
    if (
      server.getUser(thisPlayerId) != undefined &&
      server.getGameById(gameId) != undefined
    ) {
      server.gameClick(thisPlayerId, gameId);
    }
  });
  socket.on("lobbyMessage", function(msg: string) {
    if (typeof msg === "string") {
      if (Date.now() - time < 500) {
        time = Date.now();
        socket.emit("lobbyMessage", "Chat: Please do not spam the chat");
      } else {
        time = Date.now();
        server.receiveLobbyMessage(thisPlayerId, msg);
      }
    }
  });
});

//listen on port
let port = 8081;
http.listen(port, function() {
  console.log("Port is:" + port);
});
