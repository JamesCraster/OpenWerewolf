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
    addPlayer(player) {
        this.playerchat.addPlayer(player);
        super.addPlayer(player);
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
        //mute and deafen everyone in the player chat
        this.playerchat.deafenAll();
        this.playerchat.muteAll();
        //shuffle the deck and hand out roles to players
        let randomDeck = core_4.Utils.shuffle(threePlayer.list);
        for (let i = 0; i < this._players.length; i++) {
            this._players[i].send("You are the " + randomDeck[i]);
            this._players[i].data.role = randomDeck[i];
        }
        //assign three cards in the middle
        this.leftCard = randomDeck[randomDeck.length - 1];
        this.middleCard = randomDeck[randomDeck.length - 2];
        this.rightCard = randomDeck[randomDeck.length - 3];
        //perform night actions
        //unmute and undeafen everyone in the player chat
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
