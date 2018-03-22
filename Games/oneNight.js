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
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("../core");
const core_2 = require("../core");
const core_3 = require("../core");
const core_4 = require("../core");
var Roles;
(function (Roles) {
    Roles["werewolf"] = "werewolf";
    Roles["seer"] = "seer";
    Roles["robber"] = "robber";
    Roles["transporter"] = "transporter";
    Roles["villager"] = "villager";
})(Roles || (Roles = {}));
class RoleList {
    constructor(list) {
        this._list = [];
        this._list = list;
    }
    get list() {
        return this._list;
    }
}
let threePlayer = new RoleList([
    Roles.werewolf,
    Roles.werewolf,
    Roles.seer,
    Roles.robber,
    Roles.transporter,
    Roles.villager
]);
class OneNight extends core_2.Game {
    constructor() {
        super();
        //define new message room
        this.playerchat = new core_1.MessageRoom();
        this.leftCard = "";
        this.middleCard = "";
        this.rightCard = "";
        setInterval(this.update.bind(this), 500);
    }
    getPlayersWithRole(role) {
        let players = [];
        for (let i = 0; i < this._players.length; i++) {
            if (this._players[i].data.role == role) {
                players.push(this._players[i]);
            }
        }
        return players;
    }
    addPlayer(player) {
        this.playerchat.addPlayer(player);
        super.addPlayer(player);
    }
    getRandomPlayer() {
        let randomvar = Math.floor(Math.random() * this._players.length);
        if (randomvar >= this._players.length) {
            randomvar = this._players.length;
        }
        return this._players[randomvar];
    }
    getRandomPlayerFromArray(players) {
        let randomvar = Math.floor(Math.random() * players.length);
        if (randomvar >= players.length) {
            randomvar = players.length;
        }
        return players[randomvar];
    }
    update() {
        if (this._registeredPlayerCount >= this._maxPlayerCount &&
            this._inPlay == false) {
            this.start();
        }
    }
    start() {
        super.start();
        this.broadcast("The game has begun!");
        //list all of the roles in the order in which they wake up
        //mute and deafen everyone in the player chat
        this.playerchat.deafenAll();
        this.playerchat.muteAll();
        //shuffle the deck and hand out roles to players
        let randomDeck = core_4.Utils.shuffle(threePlayer.list);
        for (let i = 0; i < this._players.length; i++) {
            this._players[i].send("You are the " + randomDeck[i] + ".");
            this._players[i].data.role = randomDeck[i];
            this._players[i].data.initialRole = randomDeck[i];
        }
        //assign three cards in the middle
        this.leftCard = randomDeck[randomDeck.length - 1];
        this.middleCard = randomDeck[randomDeck.length - 2];
        this.rightCard = randomDeck[randomDeck.length - 3];
        //perform night actions
        //tell the seer 2 of the cards at random
        //swap the robber's card with someone elses and tell them their new card
        //swap two roles excluding the transporter
        //tell the werewolves who the other werewolf is
        this.playerchat.broadcast("game", "Night has fallen", true);
        for (let i = 0; i < this._players.length; i++) {
            switch (this._players[i].data.initialRole) {
                case Roles.werewolf:
                    let werewolves = this.getPlayersWithRole(Roles.werewolf);
                    if (werewolves.length == 2) {
                        this._players[i].send("There are two werewolves.");
                        this._players[i].send("Tommorrow, try not to be suspicious! You and your partner must pretend to be something else.");
                    }
                    else {
                        this._players[i].send("You are the only werewolf.");
                        this._players[i].send("Tommorrow, try not to be suspicious! Pretend to be something else.");
                    }
                    break;
                case Roles.robber:
                    let temporaryArray = this._players.slice();
                    temporaryArray.splice(i, 1);
                    let randomPlayer = this.getRandomPlayerFromArray(temporaryArray);
                    this._players[i].send("You swapped your card with '" +
                        randomPlayer.username +
                        "' who was a " +
                        randomPlayer.data.role +
                        ".");
                    this._players[i].send("You are now a " + randomPlayer.data.role + ".");
                    this._players[i].send("'" + randomPlayer.username + "' is now a robber.");
                    if (randomPlayer.data.role == Roles.werewolf) {
                        this._players[i].send("Tomorrow, try not to be suspicious! Pretend that you are not a werewolf.");
                    }
                    this._players[i].data.role = randomPlayer.data.role;
                    randomPlayer.data.role = Roles.robber;
                    break;
                case Roles.seer:
                    this._players[i].send("You look at two cards in the center.");
                    break;
                case Roles.transporter:
                    this._players[i].send("You swap x's card with y's card");
                    break;
                case Roles.villager:
                    this._players[i].send("You are a villager, so you do nothing. Goodnight!");
            }
        }
        //unmute and undeafen everyone in the player chat
        this.playerchat.undeafenAll();
        this.playerchat.unmuteAll();
        this.playerchat.broadcast("game", "Morning has broken, discuss the evidence ahead of today's trial", true);
        //start timer with callback
    }
    receive(id, msg) {
        let player = this.getPlayer(id);
        if (player instanceof core_3.Player) {
            this.playerchat.broadcast(player.id, player.username + ": " + msg);
        }
    }
}
exports.OneNight = OneNight;
