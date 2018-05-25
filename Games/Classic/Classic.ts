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
  town = "town member"
}
enum Roles {
  werewolf = "werewolf",
  townie = "townie",
  doctor = "doctor",
  cop = "cop",
  vigilante = "vigilante"
}
abstract class Role {
  private readonly _alignment: string;
  private readonly _roleID: string;
  constructor(alignment: string, roleID: string) {
    this._alignment = alignment;
    this._roleID = roleID;
  };
  public get alignment(): string {
    return this._alignment;
  }
  public get roleID(): string {
    return this._roleID;
  }
  public isRole(role: string): boolean {
    return this.roleID == role;
  }
};
class Werewolf extends Role {
  constructor() {
    super(Alignment.werewolf, Roles.werewolf);
  }
}
class Townie extends Role {
  constructor() {
    super(Alignment.town, Roles.townie);
  }
}
class Doctor extends Role {
  constructor() {
    super(Alignment.town, Roles.doctor);
  }
}
class Cop extends Role {
  constructor() {
    super(Alignment.town, Roles.cop);
  }
}
class Vigilante extends Role {
  constructor() {
    super(Alignment.town, Roles.vigilante);
  }
}
class PlayerData {
  private _alive: boolean = true;
  private _role: Role;
  private _target: string = "";
  private _healed: boolean = false;
  private _wolfVotes: number = 0;
  constructor(role: Role) {
    this._role = role;
  }
  public get alive() {
    return this._alive;
  }
  public get alignment(): string {
    return this._role.alignment;
  }
  public get roleID(): string {
    return this._role.roleID;
  }
  public isRole(roleID: string): boolean {
    return this._role.roleID == roleID;
  }
  public set target(target: string) {
    this._target = target;
  }
  public get target(): string {
    return this._target;
  }
  private clearTarget() {
    this._target = "";
  }
  public resetAfterNight() {
    this.clearTarget();
    this._healed = false;
    this._wolfVotes = 0;
  }
  public set healed(healed: boolean) {
    this._healed = healed;
  }
  public get healed(): boolean {
    return this._healed;
  }
  public kill(): void {
    this._alive = false;
  }
  public get wolfVotes() {
    return this._wolfVotes;
  }
  public incrementWolfVote() {
    if (this.alignment != Alignment.werewolf) {
      this._wolfVotes++;
    }
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
    this.broadcast("Night has fallen.", "blue", undefined);
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
    this.daychat.broadcast("Type '/act username' to do your action on someone. E.g /act frank will perform your" +
      " action on frank. You have 20 seconds to act.");

    setTimeout(this.nightResolution.bind(this), 30000);

  }
  public nightResolution() {
    //Gather the actions of each player, and perform night action resolution
    for (let i = 0; i < this._players.length; i++) {
      if (this._players[i].data.isRole(Roles.doctor)) {
        let targetPlayer = this.getPlayer(this._players[i].data.target);
        if (targetPlayer != undefined) {
          targetPlayer.data.healed = true;
        }
      }
    }
    //calculate the plurality target of the wolves
    let maxVotes = 0;
    let finalTargetPlayer: undefined | Player = undefined;
    for (let i = 0; i < this._players.length; i++) {
      if (this._players[i].data.isRole(Roles.werewolf)) {
        let targetPlayer = this.getPlayer(this._players[i].data.target);
        if (targetPlayer != undefined) {
          targetPlayer.data.incrementWolfVote();
          if (targetPlayer.data.wolfVotes >= maxVotes) {
            maxVotes = targetPlayer.data.wolfVotes;
            finalTargetPlayer = targetPlayer;
          }
        }
      }
    }
    for (let i = 0; i < this._players.length; i++) {
      let targetPlayer = this.getPlayer(this._players[i].data.target);
      if (targetPlayer != undefined) {
        switch (this._players[i].data.roleID) {
          case Roles.werewolf:
            //tell the wolves who the target is
            this._players[i].send("Your target is: ");
            if (finalTargetPlayer != undefined) {
              this._players[i].send(finalTargetPlayer.username)
              this._players[i].send("You attack your target.");
              if (finalTargetPlayer.data.healed) {
                this._players[i].send(finalTargetPlayer.username + " has died.");
              } else {
                this._players[i].send(finalTargetPlayer.username + " was healed during the night and so"+
                +" they have survived.");
              }
            } else {
              this._players[i].send("No one, as neither of you voted for a target.");
            }
            //tell the wolves if target is healed
            break;
          case Roles.cop:
            this._players[i].send("You investigated your target:");
            this._players[i].send(targetPlayer.username + " is a " + targetPlayer.data.alignment + ".");
            break;
          case Roles.vigilante:
            this._players[i].send("You shoot your target.");
            if (targetPlayer.data.healed) {
              this._players[i].send(targetPlayer.username + " was healed, and so has survived your attack.");
            } else {
              this._players[i].send(targetPlayer.username + " has died.");
              targetPlayer.data.kill();
            }
            break;
        }
      }
    }
    let deaths: number = 0;
    //Notify the dead that they have died
    for (let i = 0; i < this._players.length; i++) {
      if (!this._players[i].data.alive) {
        this._players[i].send("You have been killed!", undefined, Colors.red);
        deaths++;
      }
    }
    //Clear the actions of each player
    for (let i = 0; i < this._players.length; i++) {
      this._players[i].data.resetAfterNight();
    }
    this.werewolfchat.muteAll();
    this.phase = Phase.day;
    this.daychat.broadcast("Dawn has broken.", undefined, Colors.yellow);
    this.daychat.unmuteAll();
    //Notify the living that the dead have died
    this.daychat.broadcast("The deaths:");
    if (deaths == 0) {
      this.daychat.broadcast("Nobody died.");
    } else {
      for (let i = 0; i < this._players.length; i++) {
        if (!this._players[i].data.alive) {
          this.daychat.broadcast(this._players[i].username + " has died.");
          this.daychat.mute(this._players[i].id);
        }
      }
    }
  }
  public end() {
    this.afterEnd();
  }
  public receive(id: string, msg: string) {
    let player = this.getPlayer(id);
    if (player instanceof Player) {
      if (msg[0] == "/") {
        if (msg.slice(0, 4) == "/act" && this.phase == Phase.night) {
          let username = msg.slice(4).trim();
          let exists = false;
          for (let i = 0; i < this._players.length; i++) {
            if (this._players[i].username == username) {
              player.send("Your choice of '" + username + "' has been received");
              player.data.target = this._players[i].id;
              exists = true;
            }
          }
          if (!exists) {
            player.send("There's no player called '" + username + "'. Try again.");
          }
        }
      } else {
        this.daychat.receive(player.id, player.username + ": " + msg);
        if (player.data.isRole(Roles.werewolf)) {
          this.werewolfchat.receive(player.id, player.username + ": " + msg);
        }
      }
    }
  }
  public addPlayer(player: Player) {
    this.daychat.addPlayer(player);
    super.addPlayer(player);
  }
}
