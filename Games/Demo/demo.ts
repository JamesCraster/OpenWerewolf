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

import { MessageRoom, Server, Game, Player, Utils, RoleList, Colors, Stopwatch } from "../../core";

export class Demo extends Game {
    //declare new message room
    private playerchat: MessageRoom = new MessageRoom();
    constructor(server: Server) {
        //first argument is minimum player count, second is maximum player count
        super(server, 3, 6);
    }
    public start() {
        this.beforeStart();
    }
    public end() {
        this.afterEnd();
    }
    public update() {

    }
    public addPlayer(player: Player) {
        //add player to message room
        this.playerchat.addPlayer(player);
        super.addPlayer(player);
    }
    public receive(player: Player, msg: string) {
        //direct player's message to message room
        this.playerchat.receive(player, player.username + ": " + msg);
    }
}