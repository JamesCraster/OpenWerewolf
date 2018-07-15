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

import { MessageRoom, Game, Server, Player, Utils, RoleList, Colors, Stopwatch } from "../../Core/core";

export class Demo extends Game {
    //declare new message room
    private playerchat: MessageRoom = new MessageRoom();
    constructor(server: Server) {
        //first argument is minimum player count, second is maximum player count
        super(server, 3, 6, "Demo");
        //add new message room to the game
        super.addMessageRoom(this.playerchat);
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
        //direct player's message to the end chat (for when the game is over)
        this.endChat.receive(player, player.username + ": " + msg);
    }
}