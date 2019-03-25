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
  Colors,
  Stopwatch,
} from "../../Core/core";

import {
  Alignment,
  Roles,
  Role,
  GameEndConditions,
  priorities,
  getRoleColor,
  Passives,
  WinConditions,
  getRoleBackgroundColor,
} from "../Classic/Roles";

import { ClassicPlayer } from "./ClassicPlayer";
import { DEBUGMODE } from "../../app";
import { Phrase } from "../../Core/user";

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
let fs = require("fs");
let roleLists: { defaultLists: Array<Array<string>> } = JSON.parse(
  fs.readFileSync("Games/Classic/List.json", "utf-8"),
);

let globalMinimumPlayerCount = 4;
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
  public mafiachat: MessageRoom = new MessageRoom();
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
  //these are the messages that town crier, thanos etc. send
  public announcements: Array<Array<Phrase>> = [];
  public generalDiscussionDuration = 2 * 60000;
  constructor(server: Server, name: string, uid: string) {
    super(
      server,
      globalMinimumPlayerCount,
      15,
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
    this.players
      .filter(player => player.alive)
      .forEach(player => player.user.canVote());
  }
  private playersCannotVote() {
    for (let player of this.players) {
      player.user.cannotVote();
    }
  }
  private dayUnmute() {
    this.players
      .filter(player => player.alive)
      .forEach(player => this.daychat.unmute(player.user));
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
    for (let player of this.players) {
      player.user.headerSend([
        {
          text: "The game has ended in a stalemate.",
          color: Colors.brightYellow,
        },
      ]);
      player.user.headerSend([
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
      for (let player of this.players) {
        if (
          player.winCondition(player, this) &&
          player.alignment != Alignment.mafia &&
          player.alignment != Alignment.town
        ) {
          if (player.role.color != undefined) {
            this.headerBroadcast([
              {
                text: "The " + player.roleName + " has won!",
                color: getRoleColor(player.role),
              },
            ]);
          }
        }
      }
      //congratulate winners
      for (let player of this.players) {
        if (player.winCondition(player, this)) {
          player.user.headerSend([
            {
              text: "*** YOU WIN! ***",
              color: Colors.brightGreen,
            },
          ]);
          player.user.send([{ text: "*** YOU WIN! ***", color: Colors.brightGreen }]);
        } else {
          player.user.headerSend([
            {
              text: "*** YOU LOSE! ***",
              color: Colors.brightRed,
            },
          ]);
          player.user.send([{ text: "*** YOU LOSE! ***", color: Colors.brightRed }]);
        }
      }
      //list all winners in the chat
      let winners = "";
      let count = 0;
      for (let player of this.players) {
        if (player.winCondition(player, this)) {
          if (count == 0) {
            winners += player.user.username;
          } else {
            winners += `, ${player.user.username}`;
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
    //map the rolename strings from List.json into role classes
    let roleList: Array<Role> = roleLists.defaultLists[
      this.users.length - globalMinimumPlayerCount
    ].map(stringElem => {
      return priorities.find(elem => elem.roleName == stringElem) as Role;
    });
    this.broadcastRoleList(roleList.map(elem => elem.roleName));
    let randomDeck = Utils.shuffle(roleList);
    this.daychat.muteAll();
    //hand out roles
    for (let i = 0; i < randomDeck.length; i++) {
      this.players.push(new ClassicPlayer(this.users[i], randomDeck[i]));
    }
    this.players.filter(elem => elem.alignment == Alignment.mafia).forEach(player => {
      this.mafiachat.addUser(player.user);
      this.mafiachat.mute(player.user);
    });
    for (let player of this.players) {
      //tell the player what their role is
      this.sendRole(player);
    }
    //print the list of roles in the left panel
    for (let player of this.players) {
      for (let role of roleList.sort((a, b) => priorities.indexOf(a) - priorities.indexOf(b))) {
        player.user.leftSend(role.roleName, getRoleColor(role));
      }
    }
    for (let player of this.players) {
      if (player.role.passives.indexOf(Passives.speakWithDead) != -1) {
        player.user.send("You have the power to speak with the dead at night.");
        this.deadChat.addUser(player.user);
      }
    }
    this.players.filter(player => player.role.winCondition == WinConditions.lynchTarget).forEach(player => {
      player.assignLynchTarget(Utils.chooseCombination(this.players, 1)[0]);
      player.user.send(`Your target is ${player.winLynchTarget!.user.username} : if they are lynched, you win!`);
    });
    this.setAllTime(5000, 0);
    setTimeout(this.night.bind(this), 5000);
  }
  private sendRole(player: ClassicPlayer) {
    player.user.send(`You are a ${player.role.roleName}`, undefined, getRoleBackgroundColor(player.role));
    player.user.headerSend([
      { text: "You are a ", color: Colors.white },
      { text: player.role.roleName, color: getRoleColor(player.role) },
    ]);
    player.user.emit(
      "ownInfoSend",
      player.user.username,
      player.role.roleName,
      getRoleColor(player.role),
    );
    player.user.emit("role", player.role.roleName, getRoleColor(player.role));
  }

  private night() {
    this.cancelVoteSelection();
    this.playersCanVote();
    //reset the gallows' animation if they have been used
    for (let player of this.players) {
      player.user.resetGallows();
    }
    this.broadcast("Night has fallen.", undefined, Colors.nightBlue);
    this.headerBroadcast([
      { text: "Night has fallen", color: Colors.nightBlue },
    ]);
    this.phase = Phase.night;
    //Let the mafia communicate with one another
    this.mafiachat.unmuteAll();
    //if there is no godfather
    if (!this.players.find(elem => elem.role == Roles.godfather && elem.alive)) {
      //promote mafioso to godfather if one exists
      if (!safeCall(this.players.find(elem => elem.role == Roles.mafioso && elem.alive), mafioso => { mafioso.upgradeToGodfather(); this.sendRole(mafioso) })) {
        //there is no mafioso, so promote one of the other mafia
        safeCall(this.players.find(player => player.alignment == Alignment.mafia && player.alive), mafiaMember => { mafiaMember.upgradeToGodfather(); this.sendRole(mafiaMember) });
      }
    }
    this.mafiachat.broadcast(
      "This is the mafia chat, you can talk to other mafia now in secret.",
    );
    //tell the mafia who the other mafia are
    this.mafiachat.broadcast("The mafia are:");
    this.players
      .filter(player => player.alignment == Alignment.mafia)
      .map(player => player.user.username + ' : ' + player.role.roleName)
      .forEach(elem => this.mafiachat.broadcast(elem));

    this.daychat.broadcast("Click on someone to perform your action on them.");
    this.setAllTime(60000, 10000);
    setTimeout(this.nightResolution.bind(this), 60000);
  }
  public hang(target: ClassicPlayer) {
    target.hang();
    this.kill(target);
    target.diedThisNight = false;
  }
  public revive(target: ClassicPlayer) {
    target.revive();
    this.deadChat.removeUser(target.user);
    this.announcements.push([
      {
        text: `${target.user.username} has been revived`,
        color: Colors.standardWhite,
      },
    ]);
  }
  public kill(target: ClassicPlayer) {
    //let the other players know the target has died
    this.markAsDead(target.user.username);
    target.kill();
    if (!this.deadChat.getMemberById(target.user.id)) {
      this.deadChat.addUser(target.user);
    }
    this.daysWithoutDeath = 0;
  }
  private nightResolution() {
    //sort players based off of the const priorities list
    let nightPlayerArray = this.players.sort((a, b) => priorities.indexOf(a.role) - priorities.indexOf(b.role));
    console.log(nightPlayerArray.map(elem => console.log(elem.role.roleName)));
    //perform each player's ability in turn
    for (let actingPlayer of nightPlayerArray) {
      for (let ability of actingPlayer.abilities) {
        let targetPlayer = this.getPlayer(actingPlayer.target);
        if (targetPlayer) {
          //check player can perform ability
          if (ability.uses != 0) {
            if (!actingPlayer.roleBlocked) {
              //check condition of ability is satisfied
              if (ability.ability.condition(targetPlayer, this, actingPlayer)) {
                ability.ability.action(targetPlayer, this, actingPlayer);
                if (ability.uses) {
                  ability.uses--;
                }
              }
            } else {
              actingPlayer.user.send(
                "You were roleblocked!",
                Colors.brightRed,
              );
            }
          } else {
            actingPlayer.user.send(
              "You couldn't perform your ability; out of uses!",
              Colors.brightRed,
            );
          }
        }
      }
    }
    let deaths: number = 0;
    //Notify the dead that they have died
    for (let player of this.players) {
      if (player.diedThisNight) {
        player.user.send("You have been killed!", undefined, Colors.red);
        deaths++;
      }
    }
    //Reset each player after the night
    for (let player of this.players) {
      player.resetAfterNight();
    }
    this.mafiachat.muteAll();
    this.cancelVoteSelection();
    this.phase = Phase.day;
    this.daychat.broadcast("Dawn has broken.", undefined, Colors.yellow);
    this.headerBroadcast([
      { text: "Dawn has broken", color: Colors.brightYellow },
    ]);
    this.daychat.unmuteAll();
    for (let player of this.players) {
      if (!player.alive) {
        this.daychat.mute(player.user);
      }
    }
    //Notify the living that the dead have died
    this.daychat.broadcast("The deaths:");
    if (deaths == 0) {
      this.daychat.broadcast("Nobody died.");
    } else {
      for (let player of this.players) {
        if (player.diedThisNight) {
          this.daychat.broadcast(player.user.username + " has died.");
          this.daychat.mute(player.user);
        }
      }
    }
    for (let player of this.players) {
      player.diedThisNight = false;
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

      //read out all of the announcements
      for (let announcement of this.announcements) {
        this.headerBroadcast(announcement);
      }

      setTimeout(() => {
        this.daychat.broadcast(
          "2 minutes of general discussion until the trials begin. Discuss who to nominate.",
        );
        //make time to wait shorter if in debug mode
        if (DEBUGMODE) {
          this.setAllTime(20000, 20000);
          setTimeout(this.trialVote.bind(this), 20000);
        } else {
          this.setAllTime(this.generalDiscussionDuration, 20000);
          setTimeout(this.trialVote.bind(this), this.generalDiscussionDuration);
        }
      }, 10000);
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
    this.trialClock.start();
    this.daychat.broadcast(
      "The trial has begun! The player with a majority of votes will be put on trial.",
    );
    this.daychat.broadcast(
      "Max 60 seconds in total. If the target is acquitted you can vote for a new one. At most 3 trials a day.",
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
    let aliveCount = this.players.filter(player => player.alive).length;
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
    this.daychat.broadcast("The accused can defend themselves for 30 seconds.");
    this.daychat.muteAll();
    this.daychat.unmute(this.players[defendant].user);
    if (DEBUGMODE) {
      this.setAllTime(5000, 5000);
      setTimeout(this.finalVote.bind(this), 5 * 1000, defendant);
    } else {
      this.setAllTime(30000, 5000);
      setTimeout(this.finalVote.bind(this), 30 * 1000, defendant);
    }
  }
  private finalVote(defendant: number) {
    this.trial = Trial.verdict;
    this.dayUnmute();
    this.daychat.broadcast(
      "30 seconds to vote: click on guilty or innocent, or do nothing to abstain.",
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
    this.setAllTime(30000, 5000);
    setTimeout(this.verdict.bind(this), 30 * 1000, defendant);
  }
  private verdict(defendant: number) {
    this.players.forEach(player => player.user.emit("endVerdict"));
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
      this.hang(this.players[defendant]);
      this.daychat.broadcast(
        this.players[defendant].user.username + " has died.",
      );
      //play the hanging animation for every player
      for (let player of this.players) {
        player.user.hang([this.players[defendant].user.username]);
      }
      this.daychat.broadcast("The dead player has 30 seconds for a death speech.")
      this.setAllTime(30000, 0);
      setTimeout(this.endDay.bind(this), 30 * 1000);
    } else {
      this.daychat.broadcast(
        this.players[defendant].user.username + " has been acquitted",
      );
      if (this.trialClock.time < 60000) {
        //reset trial values and call trial vote
        this.trial = Trial.ended;
        for (let player of this.players) {
          player.resetAfterTrial();
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
    for (let player of this.players) {
      player.resetAfterTrial();
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
    //read out all the roles
    this.players.map(player => { return [{ text: `${player.user.username} was the `, color: Colors.standardWhite }, { text: player.role.roleName, color: getRoleColor(player.role) }] })
      .forEach(elem => this.daychat.broadcast(elem));
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
      //let medium etc. talk in dead chat at night
      if (player.alive && this.phase == Phase.night && player.role.passives.indexOf(Passives.speakWithDead) != -1) {
        this.deadChat.receive(player.user, [
          {
            text: "Hidden",
            color: Colors.standardWhite,
            italic: false,
          },
          { text: ": " + msg, color: Colors.grey, italic: true },
        ]);
      }
      if (player.alive) {
        //if the message is an in-game command, like voting
        if (msg[0] == "/") {
          if (Utils.isCommand(msg, "/vote") && this.phase == Phase.night) {
            let username = Utils.commandArguments(msg)[0];
            let exists = false;
            for (let i = 0; i < this.players.length; i++) {
              if (this.players[i].user.username == username) {
                exists = true;
                player.user.send(
                  "Your choice of '" + username + "' has been received.",
                );
                if (player.alignment == Alignment.mafia) {
                  this.mafiachat.broadcast(`${player.user.username} has chosen to target ${this.players[i].user.username}.`);
                }
                player.target = this.players[i].user.id;
                if (!this.players[i].alive) {
                  player.user.send("That player is dead - unless you are retributionist, you should pick someone else.");
                }
              }
            }
            if (!exists) {
              player.user.send(
                "There's no player called '" + username + "'. Try again.",
              );
            }
          } else if (
            Utils.isCommand(msg, "/unvote") &&
            this.phase == Phase.night
          ) {
            if (player.target != "") {
              player.user.send(
                `Your choice of "${
                this.getPlayer(player.target)!.user.username
                }" has been cancelled.`,
              );
              if (player.alignment == Alignment.mafia) {
                this.mafiachat.broadcast(`${player.user.username} cancelled their choice.`);
              }
              player.target = "";
            }
          } else if (
            Utils.isCommand(msg, "/vote") &&
            this.trial == Trial.nominate
          ) {
            let username = Utils.commandArguments(msg)[0];
            for (let i = 0; i < this.players.length; i++) {
              if (this.players[i].user.username == username) {
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
          //send message to day/mafiachat
          this.daychat.receive(player.user, [
            { text: player.user.username, color: player.user.color },
            { text: ": " + msg },
          ]);
          if (player.alignment == Alignment.mafia) {
            this.mafiachat.receive(user, [
              { text: player.user.username, color: player.user.color },
              { text: ": " + msg },
            ]);
          }
        }
      } else {
        //player is dead, route their message to dead chat
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
      //if the sender isn't a user, route their message to day chat as default
      this.daychat.receive(user, [
        { text: user.username, color: user.color },
        { text: ": " + msg },
      ]);
    }
  }
  public makeHost(user: User) {
    user.makeHost(
      priorities.map(elem => {
        return {
          roleName: elem.roleName,
          color: getRoleColor(elem),
        };
      }),
    );
  }
  public addUser(user: User) {
    //if there is no host, make them the host
    if (!this.users.find(elem => elem.isHost)) {
      this.makeHost(user);
    }
    this.daychat.addUser(user);
    super.addUser(user);
  }
  public getPlayer(id: string) {
    return this.players.find(player => player.user.id == id);
  }
  public resendData(user: User) {
    let player = this.getPlayer(user.id);
    if (player) {
      player.user.emit(
        "ownInfoSend",
        player.user.username,
        player.role.roleName,
        getRoleColor(player.role),
      );
      setTimeout(() => {
        for (let p of this.players.filter(elem => !elem.alive)) {
          (player as ClassicPlayer).user.markAsDead(p.user.username);
        }
      }, 500);
    }
    //if the user is the host, on reload they are still the host
    if (user.isHost) {
      this.makeHost(user);
    }
  }
  public customAdminReceive(user: User, msg: string): void {
    if (!this.inPlay) {
      //enter list of roles as a single word of first initials
      if (Utils.isCommand(msg, "!roles")) {
        let roleWord = Utils.commandArguments(msg)[0];
        roleLists.defaultLists[
          roleWord.length - this.minPlayerCount
        ] = this.parseRoleWord(roleWord);
      }
      //show the rolelist for a given number of people
      if (Utils.isCommand(msg, "!show")) {
        let number = parseInt(Utils.commandArguments(msg)[0]);
        user.send(Utils.arrayToCommaSeparated(roleLists.defaultLists[number]));
      }
    } else {
      //set general discussion length, in seconds
      if (Utils.isCommand(msg, "!daytime")) {
        if (Utils.commandArguments(msg).length > 0 && parseInt(Utils.commandArguments(msg)[0])) {
          this.generalDiscussionDuration = parseInt(Utils.commandArguments(msg)[0]) * 1000;
        }
      }
    }
  }
  private parseRoleWord(word: string) {
    let out = [];
    for (let letter of word) {
      switch (letter) {
        case "t":
          out.push(Roles.townie.roleName);
          break;
        case "v":
          out.push(Roles.vigilante.roleName);
          break;
        case "s":
          out.push(Roles.sherrif.roleName);
          break;
        case "g":
          out.push(Roles.godfather.roleName);
          break;
        case "m":
          out.push(Roles.mafioso.roleName);
          break;
        case "e":
          out.push(Roles.escort.roleName);
          break;
        case "j":
          out.push(Roles.jester.roleName);
          break;
        case "f":
          out.push(Roles.fruitVendor.roleName);
          break;
        case "d":
          out.push(Roles.doctor.roleName);
          break;
        case "u":
          out.push(Roles.medium.roleName);
          break;
        case "x":
          out.push(Roles.executioner.roleName);
          break;
        case "v":
          out.push(Roles.survivor.roleName);
          break;
        case "c":
          out.push(Roles.consort.roleName);
          break;
        case "a":
          out.push(Roles.mafiaVanilla.roleName);
      }
    }
    return out;
  }
}

function safeCall<T>(arg: T | undefined, func: (x: T) => any) {
  if (arg) {
    func(arg);
    return true;
  } else {
    return false;
  }
}