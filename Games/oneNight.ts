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
import { MessageRoom } from "../core";
import { Game } from "../core";
import { Player } from "../core";
import { Utils } from "../core";

enum Roles {
  werewolf = "werewolf",
  seer = "seer",
  robber = "robber",
  transporter = "transporter",
  villager = "villager"
}

class RoleList {
  private _list: Array<string> = [];
  constructor(list: Array<string>) {
    this._list = list;
  }
  get list() {
    return this._list;
  }
}

let threePlayer: RoleList = new RoleList([
  Roles.werewolf,
  Roles.werewolf,
  Roles.seer,
  Roles.robber,
  Roles.transporter,
  Roles.villager
]);

export class OneNight extends Game {
  //define new message room
  private playerchat: MessageRoom = new MessageRoom();
  private leftCard: string = "";
  private middleCard: string = "";
  private rightCard: string = "";

  public constructor() {
    super();
    setInterval(this.update.bind(this), 500);
  }
  public addPlayer(player: Player) {
    this.playerchat.addPlayer(player);
    super.addPlayer(player);
  }
  update() {
    if (
      this._registeredPlayerCount >= this._maxPlayerCount &&
      this._inPlay == false
    ) {
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
    let randomDeck = Utils.shuffle(threePlayer.list);
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
  receive(id: string, msg: string) {
    let player = this.getPlayer(id);
    if (player instanceof Player) {
      this.playerchat.broadcast(player.id, player.username + ": " + msg);
    }
  }
}
