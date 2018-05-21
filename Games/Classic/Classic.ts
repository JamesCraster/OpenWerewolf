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
    "This project includes code from OpenWerewolf." 
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
  private readonly _alignment:string;
  private readonly _roleID:string;
  constructor(alignment:string, roleID:string) {
    this._alignment = alignment;
    this._roleID = roleID; 
   };
   public get alignment():string{
    return this._alignment;
   }
   public get roleID():string{
     return this._roleID;
   }
};
class Werewolf extends Role {
  constructor(){
    super(Alignment.werewolf, Roles.werewolf);
  }
}
class Townie extends Role {
  constructor(){
    super(Alignment.town, Roles.townie);
  }
}
class Doctor extends Role {
  constructor(){
    super(Alignment.town, Roles.doctor);
  }
}
class Cop extends Role {
  constructor(){
    super(Alignment.town, Roles.cop);
  }
}
class Vigilante extends Role {
  constructor(){
    super(Alignment.town, Roles.vigilante);
  }
}
class PlayerData {
  private _alive: boolean = true;
  private _role: Role;
  constructor(role: Role) {
    this._role = role;
  }
  public get alignment():string{
    return this._role.alignment;
  }
  public get roleID():string{
    return this._role.roleID;
  }
  public isRole(roleID:string){
    return this._role.roleID == roleID;
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
    this.beforeStart();
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
          this._players[i].data = new PlayerData(new Werewolf());
          this._players[i].send("You are a werewolf", undefined, Colors.red);
          this.werewolfchat.addPlayer(this._players[i]);
          this.werewolfchat.mute(this._players[i].id);
          break;
        case Roles.doctor:
          this._players[i].data = new PlayerData(new Doctor());
          this._players[i].send("You are a doctor", undefined, Colors.green);
          break;
        case Roles.townie:
          this._players[i].data = new PlayerData(new Townie());
          this._players[i].send("You are a townie", undefined, Colors.green);
          break;
        case Roles.cop:
          this._players[i].data = new PlayerData(new Cop());
          this._players[i].send("You are a cop", undefined, Colors.green);
          break;
        case Roles.vigilante:
          this._players[i].data = new PlayerData(new Vigilante());
          this._players[i].send("You are a vigilante", undefined, Colors.green);
          break;
      }
    }
    this.broadcast("Night has begun", "blue", undefined);
    this.phase = Phase.night;
    //Let the werewolves communicate with one another
    this.werewolfchat.unmuteAll();
    this.werewolfchat.broadcast("This is the werewolf chat, you can talk to other wolves now in secret.");
    let werewolfList: Array<string> = [];
    for (let i = 0; i < this._players.length; i++) {
      if (this._players[i].data.isRole(Roles.werewolf)) {
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
    //Gather the actions of each player
    for(let i = 0; i < this._players.length; i++){
      switch(this._players[i].data.roleID){
      
      }
    }
    //Perform night action resolution
  }
  public end() {
    this.afterEnd();
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