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
  User,
  Utils,
  RoleList,
  Colors,
  Stopwatch,
} from "../../Core/core";

import {
  Alignment,
  Roles,
  Role,
  Ability,
  WinConditions,
  GameEndConditions,
  priorities,
} from "../../Games/Classic/Roles";

import { ClassicPlayer } from "./ClassicPlayer";
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
export enum FinalVote {
  guilty = "guilty",
  abstain = "abstain",
  innocent = "innocent",
}

const ninePlayer = new RoleList<Role>([
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
const eightPlayer = new RoleList<Role>([
  Roles.mafioso,
  Roles.mafioso,
  Roles.doctor,
  Roles.vigilante,
  Roles.sherrif,
  Roles.townie,
  Roles.townie,
  Roles.townie,
]);
const sevenPlayer = new RoleList<Role>([
  Roles.mafioso,
  Roles.mafioso,
  Roles.doctor,
  Roles.vigilante,
  Roles.sherrif,
  Roles.townie,
  Roles.townie,
]);

const sixPlayer = new RoleList([
  Roles.mafioso,
  Roles.doctor,
  Roles.vigilante,
  Roles.sherrif,
  Roles.townie,
]);
const fivePlayer = new RoleList([
  Roles.mafioso,
  Roles.doctor,
  Roles.escort,
  Roles.sherrif,
  Roles.survivor,
]);
const fourPlayer = new RoleList([
  Roles.mafioso,
  Roles.doctor,
  Roles.sherrif,
  Roles.vigilante,
]);
let globalMinimumPlayerCount = 5;
//four player games are for debugging only
if (DEBUGMODE) {
  globalMinimumPlayerCount = 4;
}
export class Classic extends Game {
  private phase: string = Phase.day;
  //what stage the trial is in
  private trial: string = Trial.ended;
  private dayClock: Stopwatch = new Stopwatch();
  private daychat: MessageRoom = new MessageRoom();
  private mafiachat: MessageRoom = new MessageRoom();
  //the interval which counts votes to get the nomination
  private tallyInterval: any;
  private trialClock: Stopwatch = new Stopwatch();
  private readonly maxTrialsPerDay: number = 3;
  private trialsThisDay: number = 0;
  //days after which there is a stalemate if no deaths
  private readonly maxDaysWithoutDeath: number = 3;
  private daysWithoutDeath: number = 0;
  private deadChat: MessageRoom = new MessageRoom();
  public players: Array<ClassicPlayer> = [];

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
    super.addMessageRoom(this.daychat);
    super.addMessageRoom(this.mafiachat);
    super.addMessageRoom(this.deadChat);
  }
  private playersCanVote() {
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].alive) {
        this.players[i].user.canVote();
      }
    }
  }
  private playersCannotVote() {
    for (let i = 0; i < this.players.length; i++) {
      this.players[i].user.cannotVote();
    }
  }
  private dayUnmute() {
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].alive) {
        this.daychat.unmute(this.players[i].user);
      }
    }
  }
  //called if the game has gone on too many days without a kill
  private stalemate() {
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
      this.players[i].user.headerSend([
        {
          text: "The game has ended in a stalemate.",
          color: Colors.brightYellow,
        },
      ]);
      this.players[i].user.headerSend([
        {
          text: "*** YOU LOSE! ***",
          color: Colors.brightRed,
        },
      ]);
    }
    this.end();
  }
  /*
   * Function that checks if town or mafia have won, and announces their victory.
   * Also announces the victory of any other winning faction.
   * Returns true if any faction has won, false otherwise.
   */
  private winCondition(): boolean {
    let townWin = GameEndConditions.townWin(this);
    let mafiaWin = GameEndConditions.mafiaWin(this);

    if (townWin) {
      this.daychat.broadcast("The town have won!", undefined, Colors.green);
      this.headerBroadcast([
        { text: "The town have won!", color: Colors.brightGreen },
      ]);
    } else if (mafiaWin) {
      this.daychat.broadcast("The mafia have won!", undefined, Colors.red);
      this.headerBroadcast([
        { text: "The mafia have won!", color: Colors.brightRed },
      ]);
    }
    if (townWin || mafiaWin) {
      //announce other factions that have won (that aren't town or mafia)
      for (let i = 0; i < this.players.length; i++) {
        if (
          this.players[i].winCondition(this.players[i], this) &&
          this.players[i].alignment != Alignment.mafia &&
          this.players[i].alignment != Alignment.town
        ) {
          this.headerBroadcast([
            {
              text: "The " + this.players[i].roleName + " has won!",
              color: Colors.brightYellow,
            },
          ]);
        }
      }
      //congratulate winners
      for (let i = 0; i < this.players.length; i++) {
        if (this.players[i].winCondition(this.players[i], this)) {
          this.players[i].user.headerSend([
            {
              text: "*** YOU WIN! ***",
              color: Colors.brightGreen,
            },
          ]);
        } else {
          this.players[i].user.headerSend([
            {
              text: "*** YOU LOSE! ***",
              color: Colors.brightRed,
            },
          ]);
        }
      }
      //list all winners in the chat
      let winners = "";
      let count = 0;
      for (let i = 0; i < this.players.length; i++) {
        if (this.players[i].winCondition(this.players[i], this)) {
          if (count == 0) {
            winners += this.players[i].user.username;
          } else {
            winners += `, ${this.players[i].user.username}`;
          }
          count++;
        }
      }
      this.broadcast(`Winners: ${winners}`, Colors.brightGreen);
      this.end();
    }
    return townWin || mafiaWin;
  }
  public start() {
    this.beforeStart();
    this.broadcastPlayerList();
    let roleList = fivePlayer.list;
    switch (this.users.length) {
      case 4:
        roleList = fourPlayer.list;
        break;
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
    this.broadcastRoleList(roleList.map(elem => elem.roleName));
    let randomDeck = Utils.shuffle(roleList);
    this.daychat.muteAll();
    //hand out roles
    for (let i = 0; i < randomDeck.length; i++) {
      switch (randomDeck[i]) {
        case Roles.mafioso:
          this.players.push(new ClassicPlayer(this.users[i], Roles.mafioso));
          this.mafiachat.addUser(this.players[i].user);
          this.mafiachat.mute(this.players[i].user);
          break;
        case Roles.doctor:
          this.players.push(new ClassicPlayer(this.users[i], Roles.doctor));
          break;
        case Roles.sherrif:
          this.players.push(new ClassicPlayer(this.users[i], Roles.sherrif));
          break;
        case Roles.vigilante:
          this.players.push(new ClassicPlayer(this.users[i], Roles.vigilante));
          break;
        case Roles.escort:
          this.players.push(new ClassicPlayer(this.users[i], Roles.escort));
          break;
        case Roles.survivor:
          this.players.push(new ClassicPlayer(this.users[i], Roles.survivor));
          break;
        default:
          console.log(
            `Critical error: the following role is not assignable: ${
              randomDeck[i]
            }`,
          );
          break;
      }
      //tell the player what their role is
      this.sendRole(
        this.players[i],
        this.players[i].alignment,
        randomDeck[i].roleName,
      );
    }
    //print the list of roles in the left panel
    for (let player of this.players) {
      for (let role of roleList.sort(
        (a, b) => priorities.indexOf(a) - priorities.indexOf(b),
      )) {
        if (role.alignment == Alignment.mafia) {
          player.user.leftSend(role.roleName, Colors.brightRed);
        } else if (role.alignment == Alignment.town) {
          player.user.leftSend(role.roleName, Colors.brightGreen);
        } else {
          player.user.leftSend(role.roleName, role.color);
        }
      }
    }
    this.setAllTime(5000, 0);
    setTimeout(this.night.bind(this), 5000);
  }
  private sendRole(player: ClassicPlayer, alignment: Alignment, role: string) {
    switch (alignment) {
      case Alignment.town:
        player.user.send(`You are a ${role}`, undefined, Colors.green);
        player.user.headerSend([
          { text: "You are a ", color: Colors.white },
          { text: role, color: Colors.brightGreen },
        ]);
        break;
      case Alignment.mafia:
        player.user.send(`You are a ${role}`, undefined, Colors.red);
        player.user.headerSend([
          { text: "You are a ", color: Colors.white },
          { text: role, color: Colors.brightRed },
        ]);
        break;
      case Alignment.neutral:
        player.user.send(`You are a ${role}`, undefined, Colors.yellow);
        player.user.headerSend([
          { text: "You are a ", color: Colors.white },
          { text: role, color: Colors.brightYellow },
        ]);
        break;
    }
  }

  private night() {
    this.cancelVoteSelection();
    this.playersCanVote();
    //reset the gallows' animation if they have been used
    for (let i = 0; i < this.players.length; i++) {
      this.players[i].user.resetGallows();
    }
    this.broadcast("Night has fallen.", undefined, Colors.nightBlue);
    this.headerBroadcast([
      { text: "Night has fallen", color: Colors.nightBlue },
    ]);
    this.phase = Phase.night;
    //Let the mafia communicate with one another
    this.mafiachat.unmuteAll();
    this.mafiachat.broadcast(
      "This is the mafia chat, you can talk to other mafia now in secret.",
    );
    let mafiaList: Array<string> = [];
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].isRole(Roles.mafioso)) {
        mafiaList.push(this.players[i].user.username);
      }
    }
    let mafiaString = "The mafia are : ";
    for (let i = 0; i < mafiaList.length; i++) {
      if (i != 0) {
        mafiaString += ", ";
      }
      mafiaString += mafiaList[i];
    }
    this.mafiachat.broadcast(mafiaString);
    this.daychat.broadcast("Click on someone to perform your action on them.");
    this.setAllTime(30000, 10000);

    setTimeout(this.nightResolution.bind(this), 30000);
  }
  public kill(player: ClassicPlayer) {
    for (let i = 0; i < this.players.length; i++) {
      this.players[i].user.lineThroughUser(player.user.username, "red");
    }
    this.markAsDead(player.user.username);
    player.kill();
    if (this.deadChat.getMemberById(player.user.id) == undefined) {
      this.deadChat.addUser(player.user);
    }
    this.daysWithoutDeath = 0;
  }
  private nightResolution() {
    //sort players based off of the const priorities list
    let nightPlayerArray = this.players.sort((element: ClassicPlayer) => {
      return priorities.indexOf(element.role);
    });
    //perform each player's ability in turn
    for (let i = 0; i < nightPlayerArray.length; i++) {
      for (let j = 0; j < nightPlayerArray[i].abilities.length; j++) {
        let targetPlayer = this.getPlayer(this.players[i].target);
        if (targetPlayer != undefined) {
          //check player can perform ability
          if (nightPlayerArray[i].abilities[j].uses != 0) {
            if (!nightPlayerArray[i].roleBlocked) {
              //check condition of ability is satisfied
              if (
                nightPlayerArray[i].abilities[j].ability.condition(
                  targetPlayer,
                  this,
                  nightPlayerArray[i],
                )
              ) {
                nightPlayerArray[i].abilities[j].ability.action(
                  targetPlayer,
                  this,
                  nightPlayerArray[i],
                );
                let uses = nightPlayerArray[i].abilities[j].uses;
                if (uses) {
                  nightPlayerArray[i].abilities[j].uses = uses - 1;
                }
              }
            } else {
              nightPlayerArray[i].user.send(
                "You were roleblocked!",
                Colors.brightRed,
              );
            }
          } else {
            nightPlayerArray[i].user.send(
              "You couldn't perform your ability; out of uses!",
              Colors.brightRed,
            );
          }
        }
      }
    }
    //calculate the plurality target of the mafia
    let maxVotes = 0;
    let finalTargetPlayer: undefined | ClassicPlayer = undefined;
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].isRole(Roles.mafioso)) {
        let targetPlayer = this.getPlayer(this.players[i].target);
        if (targetPlayer) {
          targetPlayer.incrementMafiaVote();
          if (targetPlayer.mafiaVotes >= maxVotes) {
            maxVotes = targetPlayer.mafiaVotes;
            finalTargetPlayer = targetPlayer;
          }
        }
      }
    }
    for (let i = 0; i < this.players.length; i++) {
      let targetPlayer = this.getPlayer(this.players[i].target);
      if (targetPlayer) {
        switch (this.players[i].roleName) {
          case Roles.mafioso.roleName:
            //tell the mafia who the target is
            this.players[i].user.send("Your target is: ");
            if (finalTargetPlayer) {
              this.players[i].user.send(finalTargetPlayer.user.username);
              this.players[i].user.send("You attack your target.");
              if (finalTargetPlayer.healed) {
                this.players[i].user.send(
                  finalTargetPlayer.user.username +
                    " was healed during the night and so" +
                    " they have survived.",
                );
              } else {
                this.players[i].user.send(
                  finalTargetPlayer.user.username + " has died.",
                );
                this.kill(finalTargetPlayer);
              }
            } else {
              this.players[i].user.send(
                "No one, as neither of you voted for a target.",
              );
            }
            //tell the mafia if target is healed
            break;
        }
      }
    }
    let deaths: number = 0;
    //Notify the dead that they have died
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].diedThisNight) {
        this.players[i].user.send(
          "You have been killed!",
          undefined,
          Colors.red,
        );
        deaths++;
      }
    }
    //Reset each player after the night
    for (let i = 0; i < this.players.length; i++) {
      this.players[i].resetAfterNight();
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
      if (!this.players[i].alive) {
        this.daychat.mute(this.players[i].user);
      }
    }
    //Notify the living that the dead have died
    this.daychat.broadcast("The deaths:");
    if (deaths == 0) {
      this.daychat.broadcast("Nobody died.");
    } else {
      for (let i = 0; i < this.players.length; i++) {
        if (this.players[i].diedThisNight) {
          this.daychat.broadcast(this.players[i].user.username + " has died.");
          this.daychat.mute(this.players[i].user);
        }
      }
    }
    for (let i = 0; i < this.players.length; i++) {
      this.players[i].diedThisNight = false;
    }
    this.playersCannotVote();
    this.day();
  }
  private day() {
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
  private trialVote() {
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
  private tallyVotes() {
    let count = 0;
    let defendant = 0;
    let aliveCount = 0;
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].alive) {
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
        if (this.players[j].vote == this.players[i].user.id) {
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
  private defenseSpeech(defendant: number) {
    this.cancelVoteSelection();
    this.playersCannotVote();
    this.trial = Trial.ended;
    this.daychat.broadcast(
      this.players[defendant].user.username + " is on trial.",
    );
    this.daychat.broadcast("The accused can defend themselves for 20 seconds.");
    this.daychat.muteAll();
    this.daychat.unmute(this.players[defendant].user);
    if (DEBUGMODE) {
      this.setAllTime(5000, 5000);
      setTimeout(this.finalVote.bind(this), 5 * 1000, defendant);
    } else {
      this.setAllTime(20000, 5000);
      setTimeout(this.finalVote.bind(this), 20 * 1000, defendant);
    }
  }
  private finalVote(defendant: number) {
    this.trial = Trial.verdict;
    this.dayUnmute();
    this.daychat.broadcast(
      "20 seconds to vote: click on guilty or innocent, or do nothing to abstain.",
    );
    this.headerBroadcast([
      { text: "Vote to decide ", color: Colors.white },
      {
        text: this.players[defendant].user.username,
        color: this.players[defendant].user.color,
      },
      { text: "'s fate", color: Colors.white },
    ]);
    setTimeout(() => {
      for (let i = 0; i < this.players.length; i++) {
        //block the defendant from voting in their own trial
        if (i != defendant && this.players[i].alive) {
          this.players[i].user.emit("finalVerdict");
        }
      }
    }, 3500);
    this.setAllTime(20000, 5000);
    setTimeout(this.verdict.bind(this), 20 * 1000, defendant);
  }
  private verdict(defendant: number) {
    for (let i = 0; i < this.players.length; i++) {
      this.players[i].user.emit("endVerdict");
    }
    this.daychat.muteAll();
    this.trialsThisDay++;
    let innocentCount = 0;
    let guiltyCount = 0;
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].finalVote == FinalVote.guilty) {
        this.daychat.broadcast([
          { text: this.players[i].user.username + " voted " },
          { text: "guilty", color: Colors.brightRed },
        ]);
        guiltyCount++;
      } else if (this.players[i].finalVote == FinalVote.innocent) {
        this.daychat.broadcast([
          { text: this.players[i].user.username + " voted " },
          { text: "innocent", color: Colors.brightGreen },
        ]);
        innocentCount++;
      } else if (this.players[i].alive && i != defendant) {
        this.daychat.broadcast([
          { text: this.players[i].user.username + " chose to " },
          { text: "abstain", color: Colors.brightYellow },
        ]);
      }
    }
    if (guiltyCount > innocentCount) {
      this.kill(this.players[defendant]);
      this.players[defendant].hang();
      this.players[defendant].diedThisNight = false;
      this.daychat.broadcast(
        this.players[defendant].user.username + " has died.",
      );
      for (let i = 0; i < this.players.length; i++) {
        this.players[i].user.hang([this.players[defendant].user.username]);
      }
      this.setAllTime(10000, 0);
      setTimeout(this.endDay.bind(this), 10 * 1000);
    } else {
      this.daychat.broadcast(
        this.players[defendant].user.username + " has been acquitted",
      );
      if (this.trialClock.time < 60000) {
        //reset trial values and call trial vote
        this.trial = Trial.ended;
        for (let i = 0; i < this.players.length; i++) {
          this.players[i].resetAfterTrial();
        }
        this.trialVote();
      } else {
        this.daychat.broadcast("Time's up! Night will now begin.");
        this.setAllTime(10000, 0);
        setTimeout(this.endDay.bind(this), 10 * 1000);
      }
    }
  }
  private endDay() {
    this.trialClock.restart();
    this.trialClock.stop();
    for (let i = 0; i < this.players.length; i++) {
      this.players[i].resetAfterTrial();
    }
    this.daychat.muteAll();
    this.trial = Trial.ended;
    clearInterval(this.tallyInterval);
    if (!this.winCondition()) {
      this.night();
    }
  }
  public disconnect(user: User) {
    let player = this.getPlayer(user.id);
    if (player instanceof ClassicPlayer) {
      this.kill(player);
      this.broadcast(player.user.username + " has died.");
    }
  }
  public end() {
    //reset initial conditions
    this.phase = Phase.day;
    this.trial = Trial.ended;
    this.dayClock = new Stopwatch();
    this.afterEnd();
  }
  public receive(user: User, msg: string) {
    let player = this.getPlayer(user.id);

    this.endChat.receive(user, [
      { text: user.username, color: user.color },
      { text: ": " + msg },
    ]);

    if (this.inPlay && player instanceof ClassicPlayer) {
      if (player.alive) {
        if (msg[0] == "/") {
          if (Utils.isCommand(msg, "/vote") && this.phase == Phase.night) {
            let username = msg.slice(5).trim();
            let exists = false;
            for (let i = 0; i < this.players.length; i++) {
              if (this.players[i].user.username == username) {
                exists = true;
                if (this.players[i].alive) {
                  player.user.send(
                    "Your choice of '" + username + "' has been received.",
                  );
                  player.target = this.players[i].user.id;
                } else {
                  player.user.send(
                    "That player is dead, you cannot vote for them.",
                  );
                }
              }
            }
            if (!exists) {
              player.user.send(
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
              if (this.players[i].user.username == username) {
                exists = true;
                if (this.players[i].alive) {
                  player.voteFor(this.players[i].user);
                  this.daychat.broadcast(
                    player.user.username + " voted for '" + username + "'.",
                  );
                } else {
                  player.user.send(
                    "That player is dead, you cannot vote for them.",
                  );
                }
              }
            }
          } else if (
            Utils.isCommand(msg, "/unvote") &&
            this.trial == Trial.nominate
          ) {
            if (player.vote != "") {
              let voteTarget = this.getPlayer(player.vote);
              if (voteTarget) {
                player.user.send(
                  "Your vote for " +
                    voteTarget.user.username +
                    " has been cancelled.",
                );
                this.daychat.broadcast(
                  player.user.username +
                    " cancelled their vote for " +
                    voteTarget.user.username,
                );
                player.clearVote();
              }
            } else {
              player.user.send(
                "You cannot cancel your vote as you haven't vote for anyone.",
              );
            }
          } else if (
            Utils.isCommand(msg, "/guilty") &&
            this.trial == Trial.verdict
          ) {
            player.finalVote = FinalVote.guilty;
            player.user.send("You have voted guilty.");
          } else if (
            (Utils.isCommand(msg, "/innocent") ||
              Utils.isCommand(msg, "/inno")) &&
            this.trial == Trial.verdict
          ) {
            player.finalVote = FinalVote.innocent;
            player.user.send("You have voted innocent.");
          }
        } else {
          this.daychat.receive(player.user, [
            { text: player.user.username, color: player.user.color },
            { text: ": " + msg },
          ]);
          if (player.isRole(Roles.mafioso)) {
            this.mafiachat.receive(user, [
              { text: player.user.username, color: player.user.color },
              { text: ": " + msg },
            ]);
          }
        }
      } else {
        this.deadChat.receive(player.user, [
          {
            text: player.user.username,
            color: player.user.color,
            italic: true,
          },
          { text: ": " + msg, color: Colors.grey, italic: true },
        ]);
      }
    } else {
      this.daychat.receive(user, [
        { text: user.username, color: user.color },
        { text: ": " + msg },
      ]);
    }
  }
  public addUser(user: User) {
    //player.emit('getAllRolesForSelection', [{name:'Mafia', color:'red'},{name:'Cop', color:'green'}];
    this.daychat.addUser(user);
    super.addUser(user);
  }
  private getPlayer(id: string) {
    for (let player of this.players) {
      if (player.user.id == id) {
        return player;
      }
    }
  }
}
