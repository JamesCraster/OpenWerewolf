/*
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
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("../../core");
class Demo extends core_1.Game {
    constructor(server) {
        //first argument is minimum player count, second is maximum player count
        super(server, 3, 6);
        //declare new message room
        this.playerchat = new core_1.MessageRoom();
    }
    start() {
        this.beforeStart();
    }
    end() {
        this.afterEnd();
    }
    update() {
    }
    addPlayer(player) {
        //add player to message room
        this.playerchat.addPlayer(player);
        super.addPlayer(player);
    }
    receive(player, msg) {
        //direct player's message to message room
        this.playerchat.receive(player, player.username + ": " + msg);
    }
}
exports.Demo = Demo;
