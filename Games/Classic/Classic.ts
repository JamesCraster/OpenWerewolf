/* 
    Copyright (C) 2017 James V. Craster
    This file is part of OpenWerewolf:Classic.  
    OpenWerewolf:Classic is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, version 3 of the License.
    OpenWerewolf:Classic is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.
    You should have received a copy of the GNU Affero General Public License
    along with OpenWerewolf:Classic.  If not, see <http://www.gnu.org/licenses/>.
*/

"use strict";
import { MessageRoom, Game, Server, Player, Utils, RoleList, Colors, Stopwatch } from "../../Core/core";

enum Phase {
  day = "day",
  night = "night"
}
enum Trial {
  ended = "ended",
  nominate = "nominate",
  verdict = "verdict"
}
enum finalVote {
  guilty = "guilty",
  abstain = "abstain",
  innocent = "innocent"
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
  private readonly _roleName: string;
  constructor(alignment: string, roleName: string) {
    this._alignment = alignment;
    this._roleName = roleName;
  };
  public get alignment(): string {
    return this._alignment;
  }
  public get roleName(): string {
    return this._roleName;
  }
  public isRole(role: string): boolean {
    return this.roleName == role;
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
  private _diedThisNight: boolean = false;
  private _alive: boolean = true;
  private _role: Role;
  private _target: string = "";
  private _healed: boolean = false;
  private _wolfVotes: number = 0;
  private _vote: string = "";
  private _finalVote: string = finalVote.abstain;
  constructor(role: Role) {
    this._role = role;
  }
  public get alive() {
    return this._alive;
  }
  public get alignment(): string {
    return this._role.alignment;
  }
  public get roleName(): string {
    return this._role.roleName;
  }
  public isRole(roleName: string): boolean {
    return this._role.roleName == roleName;
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
  public resetAfterTrial() {
    this._vote = "";
    this._finalVote = finalVote.abstain;
  }
  public set healed(healed: boolean) {
    this._healed = healed;
  }
  public get healed(): boolean {
    return this._healed;
  }
  public kill(): void {
    this._alive = false;
    this._diedThisNight = true;
  }
  public get wolfVotes() {
    return this._wolfVotes;
  }
  public incrementWolfVote() {
    if (this.alignment != Alignment.werewolf) {
      this._wolfVotes++;
    }
  }
  public set diedThisNight(diedThisNight: boolean) {
    this._diedThisNight = diedThisNight;
  }
  public get diedThisNight() {
    return this._diedThisNight;
  }
  public voteFor(target: Player) {
    this._vote = target.id;
  }
  public get vote() {
    return this._vote;
  }
  public set finalVote(vote: string) {
    this._finalVote = vote;
  }
  public get finalVote() {
    return this._finalVote;
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
const eightPlayer: RoleList = new RoleList([
  Roles.werewolf,
  Roles.werewolf,
  Roles.doctor,
  Roles.vigilante,
  Roles.cop,
  Roles.townie,
  Roles.townie,
  Roles.townie,
])
const sevenPlayer: RoleList = new RoleList([
  Roles.werewolf,
  Roles.werewolf,
  Roles.doctor,
  Roles.vigilante,
  Roles.cop,
  Roles.townie,
  Roles.townie
])
export class Classic extends Game {
  private ended: boolean = false;
  private phase: string = Phase.day;
  private trial: string = Trial.ended;
  private stopWatch: Stopwatch = new Stopwatch();
  private dayClock: Stopwatch = new Stopwatch();
  private nightClock: Stopwatch = new Stopwatch();
  private daychat: MessageRoom = new MessageRoom();
  private werewolfchat: MessageRoom = new MessageRoom();
  private tallyInterval: any;

  constructor(server: Server) {
    super(server, 7, 9, "Classic");
    setInterval(this.update.bind(this), 500);
  }

  public winCondition() {
    let townWin = true;
    let werewolfWin = true;
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].data.alive) {
        if (this.players[i].data.isRole(Roles.werewolf)) {
          townWin = false;
        } else {
          werewolfWin = false;
        }
      }
    }
    if (townWin) {
      this.daychat.broadcast("The town have won!", undefined, Colors.red);
      this.ended = true;
      this.daychat.unmuteAll();
      setTimeout(this.end.bind(this), 30 * 1000);
    } else if (werewolfWin) {
      this.daychat.broadcast("The werewolves have won!", undefined, Colors.green);
      this.ended = true;
      this.daychat.unmuteAll();
      setTimeout(this.end.bind(this), 30 * 1000);
    }
  }
  public update() {
    if (this.inPlay) {

    }
  }
  public start() {
    this.beforeStart();
    this.broadcastPlayerList();
    let randomDeck: Array<string> = [];
    let roleList = eightPlayer.list;
    switch (this.players.length) {
      case 7:
        roleList = sevenPlayer.list;
        break;
      case 8:
        roleList = eightPlayer.list;
        break;
      case 9:
        roleList = ninePlayer.list;
        break;
    }
    this.broadcastRoleList(roleList);
    for (let i = 0; i < this.players.length; i++) {
      for (let j = 0; j < roleList.length; j++) {
        if (roleList[j] == Roles.werewolf) {
          this.players[i].leftSend(roleList[j], Colors.brightRed);
        } else {
          this.players[i].leftSend(roleList[j], Colors.brightGreen);
        }
      }
    }
    randomDeck = Utils.shuffle(roleList);
    this.daychat.muteAll();
    //hand out roles
    for (let i = 0; i < randomDeck.length; i++) {
      switch (randomDeck[i]) {
        case Roles.werewolf:
          this.players[i].data = new PlayerData(new Werewolf());
          this.players[i].send("You are a werewolf", undefined, Colors.red);
          this.werewolfchat.addPlayer(this.players[i]);
          this.werewolfchat.mute(this.players[i]);
          break;
        case Roles.doctor:
          this.players[i].data = new PlayerData(new Doctor());
          this.players[i].send("You are a doctor", undefined, Colors.green);
          break;
        case Roles.townie:
          this.players[i].data = new PlayerData(new Townie());
          this.players[i].send("You are a townie", undefined, Colors.green);
          break;
        case Roles.cop:
          this.players[i].data = new PlayerData(new Cop());
          this.players[i].send("You are a cop", undefined, Colors.green);
          break;
        case Roles.vigilante:
          this.players[i].data = new PlayerData(new Vigilante());
          this.players[i].send("You are a vigilante", undefined, Colors.green);
          break;
      }
    }
    this.broadcast("Night has fallen.", "blue", undefined);
    this.phase = Phase.night;
    //Let the werewolves communicate with one another
    this.werewolfchat.unmuteAll();
    this.werewolfchat.broadcast("This is the werewolf chat, you can talk to other wolves now in secret.");
    let werewolfList: Array<string> = [];
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].data.isRole(Roles.werewolf)) {
        werewolfList.push(this.players[i].username);
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
      " action on frank. You have 30 seconds to act.");

    setTimeout(this.nightResolution.bind(this), 30000);

  }
  public night() {
    this.broadcast("Night has fallen.", "blue", undefined);
    this.phase = Phase.night;
    //Let the werewolves communicate with one another
    this.werewolfchat.unmuteAll();
    this.werewolfchat.broadcast("This is the werewolf chat, you can talk to other wolves now in secret.");
    let werewolfList: Array<string> = [];
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].data.isRole(Roles.werewolf)) {
        werewolfList.push(this.players[i].username);
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
      " action on frank. You have 30 seconds to act.");

    setTimeout(this.nightResolution.bind(this), 30000);
  }
  public nightResolution() {

    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].data.isRole(Roles.doctor)) {
        let targetPlayer = this.getPlayer(this.players[i].data.target);
        if (targetPlayer != undefined) {
          targetPlayer.data.healed = true;
        }
      }
    }
    //calculate the plurality target of the wolves
    let maxVotes = 0;
    let finalTargetPlayer: undefined | Player = undefined;
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].data.isRole(Roles.werewolf)) {
        let targetPlayer = this.getPlayer(this.players[i].data.target);
        if (targetPlayer != undefined) {
          targetPlayer.data.incrementWolfVote();
          if (targetPlayer.data.wolfVotes >= maxVotes) {
            maxVotes = targetPlayer.data.wolfVotes;
            finalTargetPlayer = targetPlayer;
          }
        }
      }
    }
    for (let i = 0; i < this.players.length; i++) {
      let targetPlayer = this.getPlayer(this.players[i].data.target);
      if (targetPlayer != undefined) {
        switch (this.players[i].data.roleName) {
          case Roles.werewolf:
            //tell the wolves who the target is
            this.players[i].send("Your target is: ");
            if (finalTargetPlayer != undefined) {
              this.players[i].send(finalTargetPlayer.username)
              this.players[i].send("You attack your target.");
              if (finalTargetPlayer.data.healed) {
                this.players[i].send(finalTargetPlayer.username + " was healed during the night and so" +
                  " they have survived.");
              } else {
                this.players[i].send(finalTargetPlayer.username + " has died.");
                finalTargetPlayer.data.kill();
              }
            } else {
              this.players[i].send("No one, as neither of you voted for a target.");
            }
            //tell the wolves if target is healed
            break;
          case Roles.cop:
            this.players[i].send("You investigated your target:");
            this.players[i].send(targetPlayer.username + " is a " + targetPlayer.data.alignment + ".");
            break;
          case Roles.vigilante:
            this.players[i].send("You shoot your target.");
            if (targetPlayer.data.healed) {
              this.players[i].send(targetPlayer.username + " was healed, and so has survived your attack.");
            } else {
              this.players[i].send(targetPlayer.username + " has died.");
              targetPlayer.data.kill();
            }
            break;
        }
      }
    }
    let deaths: number = 0;
    //Notify the dead that they have died
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].data.diedThisNight) {
        this.players[i].send("You have been killed!", undefined, Colors.red);
        deaths++;
      }
    }
    //Reset each player's action
    for (let i = 0; i < this.players.length; i++) {
      this.players[i].data.resetAfterNight();
    }
    this.werewolfchat.muteAll();
    this.phase = Phase.day;
    this.daychat.broadcast("Dawn has broken.", undefined, Colors.yellow);
    this.daychat.unmuteAll();
    for (let i = 0; i < this.players.length; i++) {
      if (!this.players[i].data.alive) {
        this.daychat.mute(this.players[i]);
      }
    }
    //Notify the living that the dead have died
    this.daychat.broadcast("The deaths:");
    if (deaths == 0) {
      this.daychat.broadcast("Nobody died.");
    } else {
      for (let i = 0; i < this.players.length; i++) {
        if (this.players[i].data.diedThisNight) {
          this.daychat.broadcast(this.players[i].username + " has died.");
          this.daychat.mute(this.players[i]);
        }
      }
    }
    for (let i = 0; i < this.players.length; i++) {
      this.players[i].data.diedThisNight = false;
    }
    this.day();
  }
  public day() {
    this.winCondition();
    if (!this.ended) {
      this.daychat.broadcast("1 minute of general discussion until the trials begin. Discuss who to nominate!");
      setTimeout(this.trialVote.bind(this), 10000);
    }
  }
  public trialVote() {
    if (!this.ended) {
      this.daychat.muteAll();
      this.daychat.broadcast("The trial has begun! The player with a majority of votes will be put on trial.");
      this.daychat.broadcast("Max 90 seconds. Only one trial per day, so choose carefully!");
      this.daychat.broadcast("Vote with '/vote', e.g /vote frank casts a vote for frank");
      this.trial = Trial.nominate;
      this.dayClock.restart();
      this.dayClock.start();
      this.tallyInterval = setInterval(this.tallyVotes.bind(this), 1000);
    }
  }
  public tallyVotes() {
    if (!this.ended) {
      let count = 0;
      let defendant = 0;
      let aliveCount = 0;
      for (let i = 0; i < this.players.length; i++) {
        if (this.players[i].data.alive) {
          aliveCount++;
        }
      }
      let beginTrial: boolean = false;
      for (let i = 0; i < this.players.length; i++) {
        count = 0;
        if (beginTrial) {
          break;
        }
        for (let j = 0; j < this.players.length; j++) {
          if (this.players[j].data.vote == this.players[i].id) {
            count++;
          }
          if (count > Math.floor(aliveCount / 2)) {
            beginTrial = true;
            defendant = i;
            break;
          }
        }
      }
      if (beginTrial) {
        clearInterval(this.tallyInterval);
        this.defenseSpeech(defendant);
      }
      if (this.dayClock.time > 90000) {
        this.daychat.broadcast("Time's up! Night will now begin.");
        clearInterval(this.tallyInterval);
        this.night();
      }
    }
  }
  public defenseSpeech(defendant: number) {
    if (!this.ended) {
      this.trial = Trial.ended;
      this.daychat.broadcast(this.players[defendant].username + " is on trial.");
      this.daychat.broadcast("The accused can defend themselves for 20 seconds.");
      this.daychat.muteAll();
      this.daychat.unmute(this.players[defendant]);
      setTimeout(this.finalVote.bind(this), 20 * 1000, defendant);
    }
  }
  public finalVote(defendant: number) {
    if (!this.ended) {
      this.trial = Trial.verdict;
      this.daychat.muteAll();
      this.daychat.broadcast("20 seconds to vote: guilty, inoccent, or abstain.");
      this.daychat.broadcast("To vote guilty, type '/guilty'");
      this.daychat.broadcast("To vote innocent, type '/innocent'");
      this.daychat.broadcast("To abstain, do nothing.");
      setTimeout(this.verdict.bind(this), 20 * 1000, defendant)
    }
  }
  public verdict(defendant: number) {
    if (!this.ended) {
      let innocentCount = 0;
      let guiltyCount = 0;
      for (let i = 0; i < this.players.length; i++) {
        if (this.players[i].data.finalVote == finalVote.guilty) {
          this.daychat.broadcast(this.players[i].username + " voted guilty");
          guiltyCount++;
        }
        if (this.players[i].data.finalVote == finalVote.innocent) {
          this.daychat.broadcast(this.players[i].username + " voted innocent");
          innocentCount++;
        }
      }
      if (guiltyCount > innocentCount) {
        this.players[defendant].data.kill();
        this.players[defendant].data.diedThisNight = false;
        this.daychat.broadcast(this.players[defendant].username + " has died.");
      } else {
        this.daychat.broadcast(this.players[defendant].username + " has been acquitted");
      }
      this.trial = Trial.ended;
      for (let i = 0; i < this.players.length; i++) {
        this.players[i].data.resetAfterTrial();
      }
      setTimeout(this.night.bind(this), 15 * 1000);
    }
  }

  public end() {
    //reset initial conditions
    this.phase = Phase.day;
    this.ended = false;
    this.trial = Trial.ended;
    this.stopWatch = new Stopwatch();
    this.dayClock = new Stopwatch();
    this.nightClock = new Stopwatch();
    this.daychat = new MessageRoom();
    this.werewolfchat = new MessageRoom();
    this.afterEnd();
  }
  public receive(player: Player, msg: string) {
    if (this.inPlay) {
      if (player instanceof Player && player.data.alive) {
        if (msg[0] == "/") {
          if (Utils.isCommand(msg, "/act") && this.phase == Phase.night) {
            let username = msg.slice(4).trim();
            let exists = false;
            for (let i = 0; i < this.players.length; i++) {
              if (this.players[i].username == username) {
                exists = true;
                if (this.players[i].data.alive) {
                  player.send("Your choice of '" + username + "' has been received.");
                  player.data.target = this.players[i].id;
                } else {
                  player.send("That player is dead, you cannot vote for them.");
                }
              }
            }
            if (!exists) {
              player.send("There's no player called '" + username + "'. Try again.");
            }
          } else if (Utils.isCommand(msg, "/vote") && this.trial == Trial.nominate) {
            let username = Utils.commandArguments(msg)[0];
            let exists = false;
            for (let i = 0; i < this.players.length; i++) {
              if (this.players[i].username == username) {
                exists = true;
                if (this.players[i].data.alive) {
                  player.data.voteFor(this.players[i]);
                  player.send("Your choice of '" + username + "' has been received.")
                  this.daychat.broadcast(player.username + " voted for '" + username + "'.");
                } else {
                  player.send("That player is dead, you cannot vote for them.");
                }
              }
            }
          } else if (Utils.isCommand(msg, "/guilty") && this.trial == Trial.verdict) {
            player.data.finalVote = finalVote.guilty;
            player.send("You have voted guilty.");
          } else if ((Utils.isCommand(msg, "/innocent") || Utils.isCommand(msg, "/inno")) && this.trial == Trial.verdict) {
            player.data.finalVote = finalVote.innocent;
            player.send("You have voted innocent.");
          }
        } else {
          this.daychat.receive(player, player.username + ": " + msg, undefined, undefined, player.color);
          if (player.data.isRole(Roles.werewolf)) {
            this.werewolfchat.receive(player, player.username + ": " + msg, undefined, undefined, player.color);
          }
        }
      }
    } else {
      if (player instanceof Player) {
        this.daychat.receive(player, player.username + ": " + msg, undefined, undefined, player.color);
      }
    }
  }
  public addPlayer(player: Player) {
    this.daychat.addPlayer(player);
    super.addPlayer(player);
  }
}
