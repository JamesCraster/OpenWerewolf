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

import { MessageRoom, Colors, Server, Game, Player, Utils, Stopwatch, RoleList } from "../../core";

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
abstract class Role {
  constructor() { };
};
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
  private role: Role;
  constructor(role: Role) {
    this.role = role;
  }
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
  private dayClock: Stopwatch = new Stopwatch();
  private nightClock: Stopwatch = new Stopwatch();
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
    //hand out roles
    for (let i = 0; i < randomDeck.length; i++) {
      switch (randomDeck[i]) {
        case Roles.werewolf:
          this._players[i].data = new Werewolf();
          this._players[i].send("You are a werewolf", undefined, Colors.red);
          this.werewolfchat.addPlayer(this._players[i]);
          this.werewolfchat.mute(this._players[i].id);
          break;
        case Roles.doctor:
          this._players[i].data = new Doctor();
          this._players[i].send("You are a doctor", undefined, Colors.green);
          break;
        case Roles.townie:
          this._players[i].data = new Townie();
          this._players[i].send("You are a townie", undefined, Colors.green);
          break;
        case Roles.cop:
          this._players[i].data = new Cop();
          this._players[i].send("You are a cop", undefined, Colors.green);
          break;
        case Roles.vigilante:
          this._players[i].data = new Vigilante();
          this._players[i].send("You are a vigilante", undefined, Colors.green);
          break;
      }
    }
    this.broadcast("Night has begun", "blue", undefined);
    this.werewolfchat.unmuteAll();
    this.werewolfchat.broadcast("This is the werewolf chat, you can talk to other wolves now in secret.");
    let werewolfList: Array<string> = [];
    for (let i = 0; i < this._players.length; i++) {
      if (this._players[i].data instanceof Werewolf) {
        werewolfList.push(this._players[i].username);
      }
    }
    let werewolfString = "The werewolves are : ";
    for (let i = 0; i < werewolfList.length; i++) {
      if (i != 0) {
        werewolfString += ", "
      }
      werewolfString += werewolfList[i];
    }
    this.werewolfchat.broadcast(werewolfString);
    this.phase = Phase.night;
  }
  public end() {
    super.end();
  }
  public receive(id: string, msg: string) {
    let player = this.getPlayer(id);
    if (player instanceof Player) {
      this.daychat.receive(player.id, player.username + ": " + msg);
      if (player.data instanceof Werewolf) {
        this.werewolfchat.receive(player.id, player.username + ": " + msg);
      }
    }
  }
  public addPlayer(player: Player) {
    this.daychat.addPlayer(player);
    super.addPlayer(player);
  }
}
