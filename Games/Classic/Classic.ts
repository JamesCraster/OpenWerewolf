/*
  Copyright 2017-2018 James V. Craster
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
import {
  MessageRoom,
  Game,
  Server,
  Player,
  Utils,
  RoleList,
  Colors,
  Stopwatch,
} from "../../Core/core";

import { DEBUGMODE } from "../../app";

enum Phase {
  day = "day",
  night = "night",
}
enum Trial {
  ended = "ended",
  nominate = "nominate",
  verdict = "verdict",
}
enum finalVote {
  guilty = "guilty",
  abstain = "abstain",
  innocent = "innocent",
}
enum Alignment {
  mafia = "mafia",
  town = "town member",
}
enum Roles {
  mafioso = "mafioso",
  townie = "townie",
  doctor = "doctor",
  sherrif = "sherrif",
  vigilante = "vigilante",
  escort = "escort",
}
abstract class Role {
  private readonly _alignment: string;
  private readonly _roleName: string;
  constructor(alignment: string, roleName: string) {
    this._alignment = alignment;
    this._roleName = roleName;
  }
  public get alignment(): string {
    return this._alignment;
  }
  public get roleName(): string {
    return this._roleName;
  }
  public isRole(role: string): boolean {
    return this.roleName == role;
  }
}
class Mafioso extends Role {
  constructor() {
    super(Alignment.mafia, Roles.mafioso);
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
class Sherrif extends Role {
  constructor() {
    super(Alignment.town, Roles.sherrif);
  }
}
class Vigilante extends Role {
  constructor() {
    super(Alignment.town, Roles.vigilante);
  }
}
class Escort extends Role {
  constructor() {
    super(Alignment.town, Roles.escort);
  }
}
class PlayerData {
  private _diedThisNight: boolean = false;
  private _alive: boolean = true;
  private _role: Role;
  private _target: string = "";
  private _healed: boolean = false;
  private _roleBlocked: boolean = false;
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
    this._roleBlocked = false;
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
  public roleBlock() {
    this._roleBlocked = true;
  }
  get roleBlocked() {
    return this._roleBlocked;
  }
  public kill(): void {
    if ((this._alive = true)) {
      this._alive = false;
      this._diedThisNight = true;
    }
  }
  public get wolfVotes() {
    return this._wolfVotes;
  }
  public incrementWolfVote() {
    if (this.alignment != Alignment.mafia) {
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
  public clearVote() {
    this._vote = "";
  }
  public set finalVote(vote: string) {
    this._finalVote = vote;
  }
  public get finalVote() {
    return this._finalVote;
  }
}
const ninePlayer: RoleList = new RoleList([
  Roles.mafioso,
  Roles.mafioso,
  Roles.doctor,
  Roles.vigilante,
  Roles.sherrif,
  Roles.townie,
  Roles.townie,
  Roles.townie,
  Roles.townie,
]);
const eightPlayer: RoleList = new RoleList([
  Roles.mafioso,
  Roles.mafioso,
  Roles.doctor,
  Roles.vigilante,
  Roles.sherrif,
  Roles.townie,
  Roles.townie,
  Roles.townie,
]);
const sevenPlayer: RoleList = new RoleList([
  Roles.mafioso,
  Roles.mafioso,
  Roles.doctor,
  Roles.vigilante,
  Roles.sherrif,
  Roles.townie,
  Roles.townie,
]);
//six and five player games are for debugging only
const sixPlayer: RoleList = new RoleList([
  Roles.mafioso,
  Roles.doctor,
  Roles.vigilante,
  Roles.sherrif,
  Roles.townie,
]);
const fivePlayer: RoleList = new RoleList([
  Roles.mafioso,
  Roles.doctor,
  Roles.vigilante,
  Roles.sherrif,
  Roles.townie,
]);
let globalMinimumPlayerCount = 7;
//six and five player games are for debugging only
if (DEBUGMODE) {
  globalMinimumPlayerCount = 5;
}
export class Classic extends Game {
  private ended: boolean = false;
  private phase: string = Phase.day;
  private trial: string = Trial.ended;
  private stopWatch: Stopwatch = new Stopwatch();
  private dayClock: Stopwatch = new Stopwatch();
  private nightClock: Stopwatch = new Stopwatch();
  private daychat: MessageRoom = new MessageRoom();
  private mafiachat: MessageRoom = new MessageRoom();
  private tallyInterval: any;
  private trialClock: Stopwatch = new Stopwatch();
  private readonly maxTrialsPerDay: number = 3;
  private trialsThisDay: number = 0;
  private readonly maxDaysWithoutDeath: number = 3;
  private daysWithoutDeath: number = 0;

  constructor(server: Server, name: string, uid: string) {
    super(
      server,
      globalMinimumPlayerCount,
      9,
      "Classic",
      name,
      uid,
      "OpenWerewolf-Classic",
      "James Craster",
      "Apache-2.0",
    );
    setInterval(this.update.bind(this), 500);
    super.addMessageRoom(this.daychat);
    super.addMessageRoom(this.mafiachat);
  }
  private playersCanVote() {
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].data.alive) {
        this.players[i].canVote();
      }
    }
  }
  private playersCannotVote() {
    for (let i = 0; i < this.players.length; i++) {
      this.players[i].cannotVote();
    }
  }
  public dayUnmute() {
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].data.alive) {
        this.daychat.unmute(this.players[i]);
      }
    }
  }
  //called if the game has gone on too many days without a kill
  public stalemate() {
    this.daychat.broadcast(
      "Three days have passed without a death.",
      undefined,
      Colors.yellow,
    );
    this.daychat.broadcast(
      "The game has ended in a stalemate.",
      undefined,
      Colors.yellow,
    );
    for (let i = 0; i < this.players.length; i++) {
      this.players[i].headerSend([
        {
          text: "The game has ended in a stalemate.",
          color: Colors.brightYellow,
        },
      ]);
      this.players[i].headerSend([
        {
          text: "*** YOU LOSE! ***",
          color: Colors.brightRed,
        },
      ]);
    }
    this.beforeEnd();
  }
  public beforeEnd() {
    this.ended = true;
    this.daychat.unmuteAll();
    //this.setAllTime(30 * 1000, 10 * 1000);
    //setTimeout(this.end.bind(this), 30 * 1000);
    this.end();
  }
  /*
   * Function that checks if any faction has won, and announces their victory. Returns true if any faction has won, false otherwise.
   */
  public winCondition(): boolean {
    let townWin = true;
    let mafiaWin = true;
    //the town have won if no mafia remain, the mafia have won if no town remain
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].data.alive) {
        if (this.players[i].data.alignment == Alignment.mafia) {
          townWin = false;
        } else {
          mafiaWin = false;
        }
      }
    }
    //in addition mafia win if they have a majority of players (more than or equal to ceil(n/2))
    let mafiaCount = 0;
    let aliveCount = 0;
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].data.alive) {
        aliveCount++;
        if (this.players[i].data.alignment == Alignment.mafia) {
          mafiaCount++;
        }
      }
    }
    if (mafiaCount >= Math.ceil(aliveCount / 2)) {
      mafiaWin = true;
    }
    if (townWin) {
      this.daychat.broadcast("The town have won!", undefined, Colors.green);
      this.headerBroadcast([
        { text: "The town have won!", color: Colors.brightGreen },
      ]);
      //Go through the list of players and congratulate those who are town members
      for (let i = 0; i < this.players.length; i++) {
        if (this.players[i].data.alignment == Alignment.town) {
          this.players[i].headerSend([
            {
              text: "*** YOU WIN! ***",
              color: Colors.brightGreen,
            },
          ]);
        } else {
          this.players[i].headerSend([
            {
              text: "*** YOU LOSE! ***",
              color: Colors.brightRed,
            },
          ]);
        }
      }
      this.beforeEnd();
    } else if (mafiaWin) {
      this.daychat.broadcast("The mafia have won!", undefined, Colors.red);
      this.headerBroadcast([
        { text: "The mafia have won!", color: Colors.brightRed },
      ]);
      //Go through the list of players and congratulate those who are mafia members
      for (let i = 0; i < this.players.length; i++) {
        if (this.players[i].data.alignment == Alignment.mafia) {
          this.players[i].headerSend([
            {
              text: "*** YOU WIN! ***",
              color: Colors.brightGreen,
            },
          ]);
        } else {
          this.players[i].headerSend([
            {
              text: "*** YOU LOSE! ***",
              color: Colors.brightRed,
            },
          ]);
        }
      }
      this.beforeEnd();
    }
    return mafiaWin || townWin;
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
      case 5:
        roleList = fivePlayer.list;
        break;
      case 6:
        roleList = sixPlayer.list;
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
        if (roleList[j] == Roles.mafioso) {
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
        case Roles.mafioso:
          this.players[i].data = new PlayerData(new Mafioso());
          this.mafiachat.addPlayer(this.players[i]);
          this.mafiachat.mute(this.players[i]);
          break;
        case Roles.doctor:
          this.players[i].data = new PlayerData(new Doctor());
          break;
        case Roles.townie:
          this.players[i].data = new PlayerData(new Townie());
          break;
        case Roles.sherrif:
          this.players[i].data = new PlayerData(new Sherrif());
          break;
        case Roles.vigilante:
          this.players[i].data = new PlayerData(new Vigilante());
          break;
        case Roles.escort:
          this.players[i].data = new PlayerData(new Escort());
          break;
        default:
          console.log(
            "Critical error: the following role is not assignable:" +
              randomDeck[i],
          );
          break;
      }
      //tell the player what their role is
      this.sendRole(
        this.players[i],
        this.players[i].data.alignment,
        randomDeck[i],
      );
    }
    this.setAllTime(10000, 0);
    setTimeout(() => {
      this.broadcast("Night has fallen.", undefined, Colors.nightBlue);
      this.headerBroadcast([
        { text: "Night has fallen", color: Colors.nightBlue },
      ]);
      this.phase = Phase.night;
      //Let the werewolves communicate with one another
      this.mafiachat.unmuteAll();
      this.mafiachat.broadcast(
        "This is the mafia chat, you can talk to other mafia now in secret.",
      );
      let werewolfList: Array<string> = [];
      for (let i = 0; i < this.players.length; i++) {
        if (this.players[i].data.isRole(Roles.mafioso)) {
          werewolfList.push(this.players[i].username);
        }
      }
      let werewolfString = "The mafia are : ";
      for (let i = 0; i < werewolfList.length; i++) {
        if (i != 0) {
          werewolfString += ", ";
        }
        werewolfString += werewolfList[i];
      }
      this.playersCanVote();
      this.mafiachat.broadcast(werewolfString);
      this.daychat.broadcast(
        "Click on someone to perform your action on them.",
      );
      this.setAllTime(30000, 10000);

      setTimeout(this.nightResolution.bind(this), 30000);
    }, 10000);
  }
  private sendRole(player: Player, alignment: Alignment, role: string) {
    switch (alignment) {
      case Alignment.town:
        player.send("You are a " + role, undefined, Colors.green);
        player.headerSend([
          { text: "You are a ", color: Colors.white },
          { text: role, color: Colors.brightGreen },
        ]);
        break;
      case Alignment.mafia:
        player.send("You are a " + role, undefined, Colors.red);
        player.headerSend([
          { text: "You are a ", color: Colors.white },
          { text: role, color: Colors.brightRed },
        ]);
        break;
    }
  }

  public night() {
    this.cancelVoteSelection();
    this.playersCanVote();
    if (!this.ended) {
      //reset the gallows' animation if they have been used
      for (let i = 0; i < this.players.length; i++) {
        this.players[i].resetGallows();
      }
      this.broadcast("Night has fallen.", undefined, "#1919cc");
      this.headerBroadcast([
        { text: "Night has fallen", color: Colors.nightBlue },
      ]);
      this.phase = Phase.night;
      //Let the mafia communicate with one another
      this.mafiachat.unmuteAll();
      this.mafiachat.broadcast(
        "This is the mafia chat, you can talk to other mafia now in secret.",
      );
      let werewolfList: Array<string> = [];
      for (let i = 0; i < this.players.length; i++) {
        if (this.players[i].data.isRole(Roles.mafioso)) {
          werewolfList.push(this.players[i].username);
        }
      }
      let werewolfString = "The mafia are : ";
      for (let i = 0; i < werewolfList.length; i++) {
        if (i != 0) {
          werewolfString += ", ";
        }
        werewolfString += werewolfList[i];
      }
      this.mafiachat.broadcast(werewolfString);
      this.daychat.broadcast(
        "Click on someone to perform your action on them.",
      );
      this.setAllTime(30000, 10000);

      setTimeout(this.nightResolution.bind(this), 30000);
    }
  }
  private kill(player: Player) {
    for (let i = 0; i < this.players.length; i++) {
      this.players[i].lineThroughPlayer(player.username, "red");
    }
    this.markAsDead(player.username);
    player.data.kill();
    this.daysWithoutDeath = 0;
  }
  public nightResolution() {
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].data.isRole(Roles.escort)) {
        let targetPlayer = this.getPlayer(this.players[i].data.target);
        if (targetPlayer != undefined) {
          targetPlayer.data.roleBlock();
        }
      }
    }
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].data.isRole(Roles.doctor)) {
        let targetPlayer = this.getPlayer(this.players[i].data.target);
        if (targetPlayer != undefined) {
          if (!this.players[i].data.roleBlocked) {
            targetPlayer.data.healed = true;
          } else {
            this.players[i].send(
              "You were roleblocked.",
              undefined,
              Colors.red,
            );
          }
        }
      }
    }
    //calculate the plurality target of the mafia
    let maxVotes = 0;
    let finalTargetPlayer: undefined | Player = undefined;
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].data.isRole(Roles.mafioso)) {
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
          case Roles.mafioso:
            //tell the mafia who the target is
            this.players[i].send("Your target is: ");
            if (finalTargetPlayer != undefined) {
              this.players[i].send(finalTargetPlayer.username);
              this.players[i].send("You attack your target.");
              if (finalTargetPlayer.data.healed) {
                this.players[i].send(
                  finalTargetPlayer.username +
                    " was healed during the night and so" +
                    " they have survived.",
                );
              } else {
                this.players[i].send(finalTargetPlayer.username + " has died.");
                this.kill(finalTargetPlayer);
              }
            } else {
              this.players[i].send(
                "No one, as neither of you voted for a target.",
              );
            }
            //tell the mafia if target is healed
            break;
          case Roles.sherrif:
            this.players[i].send("You investigated your target:");
            if (!this.players[i].data.roleBlocked) {
              this.players[i].send(
                targetPlayer.username +
                  " is a " +
                  targetPlayer.data.alignment +
                  ".",
              );
            } else {
              this.players[i].send(
                "You were roleblocked.",
                undefined,
                Colors.red,
              );
            }
            break;
          case Roles.vigilante:
            this.players[i].send("You shoot your target.");
            if (this.players[i].data.roleBlocked) {
              this.players[i].send(
                "You were roleblocked.",
                undefined,
                Colors.red,
              );
            } else if (targetPlayer.data.healed) {
              this.players[i].send(
                targetPlayer.username +
                  " was healed, and so has survived your attack.",
              );
            } else {
              this.players[i].send(targetPlayer.username + " has died.");
              this.kill(targetPlayer);
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
    this.mafiachat.muteAll();
    this.cancelVoteSelection();
    this.phase = Phase.day;
    this.daychat.broadcast("Dawn has broken.", undefined, Colors.yellow);
    this.headerBroadcast([
      { text: "Dawn has broken", color: Colors.brightYellow },
    ]);
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
    this.playersCannotVote();
    this.day();
  }
  public day() {
    if (!this.winCondition()) {
      if (this.daysWithoutDeath == 1) {
        this.daychat.broadcast(
          "No one died yesterday. If no one dies in the next two days the game will end in a stalemate.",
        );
      }
      if (this.daysWithoutDeath == 2) {
        this.daychat.broadcast(
          "No one has died for two days. If no one dies by tomorrow morning the game will end in a stalemate.",
        );
      }
      //If no one has died in three days, end the game in a stalemate.
      if (this.daysWithoutDeath >= this.maxDaysWithoutDeath) {
        this.stalemate();
      }
      this.daysWithoutDeath++;
      this.trialsThisDay = 0;
      this.trialClock.restart();
      this.trialClock.stop();
      this.daychat.broadcast(
        "1 minute of general discussion until the trials begin. Discuss who to nominate!",
      );
      //make time to wait shorter if in debug mode
      if (DEBUGMODE) {
        this.setAllTime(20000, 20000);
        setTimeout(this.trialVote.bind(this), 20000);
      } else {
        this.setAllTime(60000, 20000);
        setTimeout(this.trialVote.bind(this), 60000);
      }
    }
  }
  public trialVote() {
    if (!this.ended) {
      if (this.trialsThisDay >= this.maxTrialsPerDay) {
        this.daychat.broadcast(
          "The town is out of trials - you only get 3 trials a day! Night begins.",
        );
        this.endDay();
        return;
      }
      this.dayUnmute();
      this.cancelVoteSelection();
      console.log(this.trialClock.time);
      this.trialClock.start();
      this.daychat.broadcast(
        "The trial has begun! The player with a majority of votes will be put on trial.",
      );
      this.daychat.broadcast(
        "Max 60 seconds. If the target is acquited you can vote for a new one.",
      );
      this.daychat.broadcast("Click on somebody to nominate them.");
      this.playersCanVote();
      this.setAllTime(Math.max(0, 60000 - this.trialClock.time), 20000);
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
          if (count >= Math.floor(aliveCount / 2) + 1) {
            beginTrial = true;
            defendant = i;
            break;
          }
        }
      }
      if (beginTrial) {
        this.trialClock.stop();
        clearInterval(this.tallyInterval);
        this.defenseSpeech(defendant);
      }
      if (this.trialClock.time > 60000) {
        this.daychat.broadcast("Time's up! Night will now begin.");
        this.endDay();
      }
    }
  }
  public defenseSpeech(defendant: number) {
    if (!this.ended) {
      this.cancelVoteSelection();
      this.playersCannotVote();
      this.trial = Trial.ended;
      this.daychat.broadcast(
        this.players[defendant].username + " is on trial.",
      );
      this.daychat.broadcast(
        "The accused can defend themselves for 20 seconds.",
      );
      this.daychat.muteAll();
      this.daychat.unmute(this.players[defendant]);
      if (DEBUGMODE) {
        this.setAllTime(5000, 5000);
        setTimeout(this.finalVote.bind(this), 5 * 1000, defendant);
      } else {
        this.setAllTime(20000, 5000);
        setTimeout(this.finalVote.bind(this), 20 * 1000, defendant);
      }
    }
  }
  public finalVote(defendant: number) {
    if (!this.ended) {
      this.trial = Trial.verdict;
      //this.daychat.muteAll();
      this.dayUnmute();
      this.daychat.broadcast(
        "20 seconds to vote: click on guilty or innocent, or do nothing to abstain.",
      );
      this.headerBroadcast([
        { text: "Vote to decide ", color: Colors.white },
        {
          text: this.players[defendant].username,
          color: this.players[defendant].color,
        },
        { text: "'s fate", color: Colors.white },
      ]);
      setTimeout(() => {
        for (let i = 0; i < this.players.length; i++) {
          //block the defendant from voting in their own trial
          if (i != defendant) {
            this.players[i].emit("finalVerdict");
          }
        }
      }, 3500);
      this.setAllTime(20000, 5000);
      setTimeout(this.verdict.bind(this), 20 * 1000, defendant);
    }
  }
  public verdict(defendant: number) {
    if (!this.ended) {
      for (let i = 0; i < this.players.length; i++) {
        this.players[i].emit("endVerdict");
      }
      this.daychat.muteAll();
      this.trialsThisDay++;
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
        this.kill(this.players[defendant]);
        this.players[defendant].data.diedThisNight = false;
        this.daychat.broadcast(this.players[defendant].username + " has died.");
        for (let i = 0; i < this.players.length; i++) {
          this.players[i].hang([this.players[defendant].username]);
        }
        this.setAllTime(10000, 0);
        setTimeout(this.endDay.bind(this), 10 * 1000);
      } else {
        this.daychat.broadcast(
          this.players[defendant].username + " has been acquitted",
        );
        if (this.trialClock.time < 60000) {
          //reset trial values and call trial vote
          this.trial = Trial.ended;
          for (let i = 0; i < this.players.length; i++) {
            this.players[i].data.resetAfterTrial();
          }
          this.trialVote();
        } else {
          this.daychat.broadcast("Time's up! Night will now begin.");
          this.setAllTime(10000, 0);
          setTimeout(this.endDay.bind(this), 10 * 1000);
        }
      }
    }
  }
  public endDay() {
    this.trialClock.restart();
    this.trialClock.stop();
    for (let i = 0; i < this.players.length; i++) {
      this.players[i].data.resetAfterTrial();
    }
    this.daychat.muteAll();
    this.trial = Trial.ended;
    clearInterval(this.tallyInterval);
    if (!this.winCondition()) {
      this.night();
    }
  }
  public disconnect(player: Player) {
    this.kill(player);
    this.broadcast(player.username + " has died.");
  }
  public end() {
    //reset initial conditions
    this.phase = Phase.day;
    this.ended = false;
    this.trial = Trial.ended;
    this.stopWatch = new Stopwatch();
    this.dayClock = new Stopwatch();
    this.nightClock = new Stopwatch();
    this.afterEnd();
  }
  public receive(player: Player, msg: string) {
    this.endChat.receive(
      player,
      player.username + ": " + msg,
      undefined,
      undefined,
      player.color,
    );
    if (this.inPlay) {
      if (player.data.alive) {
        if (msg[0] == "/") {
          if (Utils.isCommand(msg, "/vote") && this.phase == Phase.night) {
            let username = msg.slice(5).trim();
            let exists = false;
            for (let i = 0; i < this.players.length; i++) {
              if (this.players[i].username == username) {
                exists = true;
                if (this.players[i].data.alive) {
                  player.send(
                    "Your choice of '" + username + "' has been received.",
                  );
                  player.data.target = this.players[i].id;
                } else {
                  player.send("That player is dead, you cannot vote for them.");
                }
              }
            }
            if (!exists) {
              player.send(
                "There's no player called '" + username + "'. Try again.",
              );
            }
          } else if (
            Utils.isCommand(msg, "/vote") &&
            this.trial == Trial.nominate
          ) {
            let username = Utils.commandArguments(msg)[0];
            let exists = false;
            for (let i = 0; i < this.players.length; i++) {
              if (this.players[i].username == username) {
                exists = true;
                if (this.players[i].data.alive) {
                  player.data.voteFor(this.players[i]);
                  player.send(
                    "Your choice of '" + username + "' has been received.",
                  );
                  this.daychat.broadcast(
                    player.username + " voted for '" + username + "'.",
                  );
                } else {
                  player.send("That player is dead, you cannot vote for them.");
                }
              }
            }
          } else if (
            Utils.isCommand(msg, "/unvote") &&
            this.trial == Trial.nominate
          ) {
            if (player.data.vote != "") {
              let voteTarget = this.getPlayer(player.data.vote);
              if (voteTarget) {
                player.send(
                  "Your vote for " +
                    voteTarget.username +
                    " has been cancelled.",
                );
                this.daychat.broadcast(
                  player.username +
                    " cancelled their vote for " +
                    voteTarget.username,
                );
                player.data.clearVote();
              }
            } else {
              player.send(
                "You cannot cancel your vote as you haven't vote for anyone.",
              );
            }
          } else if (
            Utils.isCommand(msg, "/guilty") &&
            this.trial == Trial.verdict
          ) {
            player.data.finalVote = finalVote.guilty;
            player.send("You have voted guilty.");
          } else if (
            (Utils.isCommand(msg, "/innocent") ||
              Utils.isCommand(msg, "/inno")) &&
            this.trial == Trial.verdict
          ) {
            player.data.finalVote = finalVote.innocent;
            player.send("You have voted innocent.");
          }
        } else {
          this.daychat.receive(
            player,
            player.username + ": " + msg,
            undefined,
            undefined,
            player.color,
          );
          if (player.data.isRole(Roles.mafioso)) {
            this.mafiachat.receive(
              player,
              player.username + ": " + msg,
              undefined,
              undefined,
              player.color,
            );
          }
        }
      }
    } else {
      this.daychat.receive(
        player,
        player.username + ": " + msg,
        undefined,
        undefined,
        player.color,
      );
    }
  }
  public addPlayer(player: Player) {
    this.daychat.addPlayer(player);
    super.addPlayer(player);
  }
}
