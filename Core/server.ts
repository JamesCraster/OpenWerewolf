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

import { Socket } from "../node_modules/@types/socket.io";
import { Player } from './player';
import { Game } from './game';
import { Utils, Colors } from './utils'
var grawlix = require("grawlix");

export class Server {
    private _players: Array<Player> = [];
    private _games: Array<Game> = [];
    private _registeredPlayerCount: number = 0;
    private _debugMode: boolean = false;
    public constructor() {
        this._registeredPlayerCount = 0;
        this._games = [];
        //join waiting players to games that need them
        setInterval(this.joinGame.bind(this), 50);
    }
    public setDebug() {
        this._debugMode = true;
    }
    public gameClick(id: string, game: number) {
        let player = this.getPlayer(id);
        if (player) {
            player.gameClickedLast = game;
        }
    }
    public get gameTypes() {
        let gameTypes = [];
        for (let i = 0; i < this.numberOfGames; i++) {
            gameTypes.push(this._games[i].gameType);
        }
        return gameTypes;
    }
    public get inPlayArray() {
        let inPlayArray = [];
        for (let i = 0; i < this._games.length; i++) {
            inPlayArray.push(this._games[i].inPlay);
        }
        return inPlayArray;
    }
    public get numberOfGames() {
        return this._games.length;
    }
    public get playerNameColorPairs() {
        let playerNameColorPairs = [];
        for (let i = 0; i < this._games.length; i++) {
            playerNameColorPairs.push(this._games[i].playerNameColorPairs);
        }
        return playerNameColorPairs;
    }
    public addGame(game: Game) {
        this._games.push(game);
        game.index = this._games.length - 1;
    }
    public leaveGame(id:string){
        let player = this.getPlayer(id);
        if(player instanceof Player){
            if(player.registered && player.inGame){
                if(player.game >= 0 && player.game < this._games.length){
                    if(this._games[player.game].inPlay == false){
                        this._games[player.game].kick(player);
                        player.resetAfterGame();
                    }
                }
            }
        }
    }
    //join waiting players to games
    private joinGame() {
        this._players.forEach(player => {
            if (player.registered && !player.inGame && player.gameClickedLast >= 0 && player.gameClickedLast < this._games.length) {
                let j = player.gameClickedLast;
                //if game needs a player
                if (this._games[j].playersNeeded > 0) {
                    player.inGame = true;
                    player.game = j;
                    player.send(
                        "Hi, " +
                        player.username +
                        "! You have joined Game " +
                        (j + 1).toString() +
                        "."
                    );
                    this._games[j].broadcast(player.username + " has joined the game");
                    player.send("There are " + (this._games[j].playerCount + 1).toString() + " players in this game");
                    if (this._games[j].minimumPlayersNeeded - 1 > 0) {
                        this._games[j].broadcast("The game will begin when at least " + (this._games[j].minimumPlayersNeeded - 1).toString() + " more players have joined");
                        //if just hit the minimum number of players
                    } else if (this._games[j].minimumPlayersNeeded - 1 == 0) {
                        this._games[j].broadcast("The game will start in 30 seconds. Type \"/start\" to start the game now");
                    }
                    this._games[j].addPlayer(player);
                    if (this._games[j].minimumPlayersNeeded > 0) {
                        player.send("The game will begin when at least " + (this._games[j].minimumPlayersNeeded).toString() + " more players have joined");
                        //if just hit the minimum number of players
                    } else if (this._games[j].minimumPlayersNeeded == 0) {
                        player.send("The game will start in 30 seconds. Type \"/start\" to start the game now");
                        this._games[j].setAllTime(this._games[j].startWait, 10000);
                    }
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
        if (grawlix.isObscene(username)) {
            player.send("Invalid username: Usernames can't contain profanity");
            return false;
        }
        return true;
    }
    public addPlayer(socket: Socket, session: string) {
        let newPlayer = new Player(socket, session);
        if (!this._debugMode) {
            for (let i = 0; i < this._players.length; i++) {
                if (this._players[i].inGame && this._players[i].session == session) {
                    socket.emit("message", "You're already playing a game in a different tab, so you cannot join this one.", undefined, Colors.red);
                    newPlayer.banFromRegistering();
                }
            }
        }
        this._players.push(newPlayer);
        //update the games for the player as they have been absent for about 2 seconds, if they were reloading.
        for (let j = 0; j < this._games.length; j++) {
            this._players[this._players.length - 1].updateGameListing("Game " + (j + 1).toString(),
                this._games[j].playerNameColorPairs, j, this._games[j].inPlay);
        }
        console.log("Player length on add: " + this._players.length);

    }
    private register(player: Player, msg: string) {
        if (!this._debugMode) {
            if (player.cannotRegister) {
                return;
            }
            for (let i = 0; i < this._players.length; i++) {
                if (this._players[i].inGame && this._players[i].session == player.session) {
                    player.send("You're already playing a game in a different tab, so you cannot join this one.", undefined, Colors.red);
                    player.banFromRegistering();
                    return;
                }
            }
        }
        if (player.gameClickedLast >= 0 && player.gameClickedLast < this._games.length) {
            if (this._games[player.gameClickedLast].playersNeeded == 0) {
                player.send("This game is has already started, please join a different one.");
                return;
            }
        }
        if(player.gameClickedLast >= 0 && player.gameClickedLast < this._games.length){
            //get rid of spaces in name and make lowercase
            msg = Server.cleanUpUsername(msg);

            if (this.validateUsername(player, msg)) {
                player.register();
                player.setUsername(msg);
                this._registeredPlayerCount++;
            }
        }
    }
    public receive(id: string, msg: string) {
        let player = this.getPlayer(id);
        if (player != undefined) {
            if (!player.registered) {
                this.register(player, msg);
            } else {
                if (player.inGame) {
                    //if trying to sign in as admin 
                    if (msg.slice(0, 1) == "!") {
                        if (player.verifyAsAdmin(msg)) {
                            player.send('You have been granted administrator access', undefined, Colors.green);
                        }
                        if (player.admin) {
                            if (this._games[player.game].isPlayer(id)) {
                                this._games[player.game].adminReceive(player, msg);
                            }
                        }
                    } else if (msg[0] == "/" && !this._games[player.game].inPlay && player.startVote == false) {
                        if (Utils.isCommand(msg, "/start")) {
                            player.startVote = true;
                            this._games[player.game].broadcast(player.username + " has voted to start the game immediately by typing \"/start\"");
                        }
                    } else if (this.validateMessage(msg)) {
                        msg = grawlix(msg, { style: "asterix" });
                        if (this._games[player.game].isPlayer(id)) {
                            this._games[player.game].receive(player, msg);
                        }
                    }
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
    private validateMessage(msg: string): boolean {
        if (msg.trim() == "" || msg.length > 151) {
            return false;
        } else {
            return true;
        }
    }
    public markGameStatusInLobby(game: number, status: string) {
        for (let i = 0; i < this._players.length; i++) {
            this._players[i].markGameStatusInLobby(game, status);
        }
    }
    public listPlayerInLobby(username: string, color: string, game: number) {
        for (let i = 0; i < this._players.length; i++) {
            this._players[i].addListingToLobby(username, color, game);
            //if the player is viewing the game, add joiner to their right bar
            if (this._players[i].game == game) {
                this._players[i].rightSend(username, color);
            } else if (!this._players[i].registered && this._players[i].gameClickedLast == game) {
                this._players[i].rightSend(username, color);
            }
        }
    }
    public unlistPlayerInLobby(username: string, game: number) {
        for (let i = 0; i < this._players.length; i++) {
            this._players[i].removePlayerListingFromLobby(username, game);
            //if the player is viewing the game, remove leaver from their right bar
            if (this._players[i].game == game) {
                this._players[i].removeRight(username);
            } else if (!this._players[i].registered && this._players[i].gameClickedLast == game) {
                this._players[i].removeRight(username);
            }
        }
    }
    public kick(id: string): void {
        var player = this.getPlayer(id);
        if (player instanceof Player) {
            console.log(player.username);
            var index = this._players.indexOf(player);
            console.log("Player index: " + index);
            if (index !== -1) {
                console.log("Player length before remove: " + this._players.length);
                console.log(this._players.splice(index, 1)[0].username);
                console.log("Player length after remove: " + this._players.length);
                if (player.registered && this._registeredPlayerCount > 0) {
                    this._registeredPlayerCount--;
                    if (player.inGame) {
                        this._games[player.game].lineThroughPlayer(player.username);
                        if (!this._games[player.game].inPlay) {
                            this._games[player.game].kick(player);
                        }
                        player.disconnect();
                    }
                }
            }
        } else {
            console.log(
                "Error: Server.kick" +
                ": tried to kick player " +
                "id" +
                " but that player does not exist"
            );
        }
    }
}