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
    
    Additional terms under GNU AGPL version 3 section 7:
    I (James Craster) require the preservation of this specified author attribution 
    in the Appropriate Legal Notices displayed by works containing material that has 
    been added to OpenWerewolf by me: 
    "This project includes code from OpenWerewolf. OpenWerewolf author: James V. Craster." 
*/

"use strict";

import { MessageRoom } from "../../core";
import { Server } from "../../core";
import { Game } from "../../core";
import { Player } from "../../core";
import { Utils } from "../../core";
import { Stopwatch } from "../../core";
import { RoleList } from "../../core";

enum Phase {
  day = "day",
  night = "night"
}
enum Alignment {
  werewolf = "werewolf",
  town = "town"
}
enum Roles {
  werewolf = "werewolf",
  townie = "townie",
  doctor = "doctor",
  cop = "cop",
  vigilante = "vigilante"
}
abstract class Role { };
class Werewolf extends Role {
  private alignment: string = Alignment.werewolf;
}
class Townie extends Role {
  private alignment: string = Alignment.town;
}
class Doctor extends Role {
  private alignment: string = Alignment.town;
}
class Cop extends Role {
  private alignment: string = Alignment.town;
}
class Vigilante extends Role {
  private alignment: string = Alignment.town;
}
class PlayerData {
  private alive: boolean = true;
  private role: any;
}
const ninePlayer: RoleList = new RoleList([
  Roles.werewolf,
  Roles.werewolf,
  Roles.doctor,
  Roles.vigilante,
  Roles.cop,
  Roles.townie,
  Roles.townie,
  Roles.townie,
  Roles.townie
]);
export class Classic extends Game {
  private phase: string = Phase.day;
  private stopWatch: Stopwatch = new Stopwatch();
  private daychat: MessageRoom = new MessageRoom();
  private werewolfchat: MessageRoom = new MessageRoom();

  constructor(server: Server) {
    super(server, 9, 9);
    setInterval(this.update.bind(this), 500);
  }
  public update() {
    //if have max number of players, start the game immediately
    if (
      this._registeredPlayerCount >= this._maxPlayerCount &&
      this._inPlay == false
    ) {
      this.start();
    }
    //if game running
    if (this._inPlay) {

    }
  }
  public start() {
    super.start()
    this.broadcast("***NEW GAME***", "#03b603");
    this.broadcastPlayerList();
    let randomDeck: Array<string> = [];
    let roleList = ninePlayer.list;
    this.broadcastRoleList(roleList);
    randomDeck = Utils.shuffle(roleList);
    this.daychat.muteAll();
    this.daychat.unmuteAll();
  }
  public end() {
    super.end();
  }
  public receive(id: string, msg: string) {
    let player = this.getPlayer(id);
    if (player instanceof Player) {
      this.daychat.receive(player.id, player.username + ": " + msg);
    }
  }
  public addPlayer(player: Player) {
    this.daychat.addPlayer(player);
    super.addPlayer(player);
  }

}
