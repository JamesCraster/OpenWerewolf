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
  Player,
} from "../../core/core";
class OneDayPlayer extends Player {
  public actionRole: Roles;
  public initialRole: Roles;
  public role: Roles;
  public voteCount = 0;
  public hanged = false;
  public vote = "";
  constructor(user: User, initialRole: Roles) {
    super(user);
    this.initialRole = initialRole;
    this.actionRole = initialRole;
    this.role = initialRole;
  }
}
enum Roles {
  undefined = "undefined",
  /**
   * The evil role, there may be two in the game. They wake up and see each other
   */
  werewolf = "werewolf",
  /**
   * Wolf that gets to see two cards from the middle
   */
  wolfseer = "wolf seer",
  /**
   * Wolf that sees one other players' card
   */
  psychicWolf = "psychic wolf",
  /**
   * Wolf that doesn't wake up with the other wolves
   */
  drunkwolf = "drunk wolf",
  /**
   * Sees one card from the centre
   */
  apprenticeSeer = "apprentice seer",
  /**
   *  Sees two cards from the centre
   */
  seer = "seer",
  /*
   * Town role. Picks two player's cards and sees if they are on the same team or not.
   * Neutral roles show up as on different teams unless they have the same win condition or are the same role.
   * Two executioners are on the same team.
   * Apprentice jester and jester are on the same team.
   * Serial killer and survivor are on the same team.
   *
   * Love does not affect who is or isn't on the same team.
   */
  mentalist = "mentalist",
  /**
   *  Swaps someone else's card with their own and looks at it
   */
  robber = "robber",
  /*
   * Swaps someone else's card with their own and does not look at it
   */
  drunkRobber = "drunk robber",
  /**
   *  Swaps two people's cards, potentially including themselves
   */
  transporter = "transporter",
  /**
   *  Does nothing
   */
  villager = "villager",
  /**
   * Swaps two people's cards, not including themselves
   */
  troublemaker = "troublemaker",
  /**
   *  Sees the other masons (including the weremasons)
   */
  mason = "mason",
  /*
   * A werewolf that wakes up and sees the masons.
   */
  weremason = "weremason",
  /*
   *  A werewolf-aligned role that can die without the werewolves losing.
   *  Knows the werewolves, but is unknown to the werewolves.
   */
  minion = "minion",
  /*
   * Town-aligned role, forces a player to choose someone specific as (one of) their targets.
   * The chosen player will be informed that they were bewitched.
   */
  witch = "witch",
  /*
   * Town aligned role, cannot be swapped by anyone except the robber.
   */
  android = "android",
  /*
   * Prevents someone from doing their role's action. Their target will be informed they were jailed.
   * Jailed targets can have their role swapped.
   */
  jailor = "jailor",
  /*
   * Neutral. Looks at a card in the middle and becomes that role, and then does the corresponding night action,
   * if they haven't been jailed.
   */
  amnesiac = "amnesiac",
  /*
   * Neutral. Looks at someone else's card and becomes that role, and then does the corresponding night action,
   * unless they have been jailed.
   */
  doppleganger = "doppleganger",
  /*
   * Has no alignment, just wants to avoid being hanged.
   */
  survivor = "survivor",
  /**
   *  Takes one card from the middle without looking at it, unless it is executioner.
   */
  drunk = "drunk",
  /**
   *  Looks at their card at the end of the night phase to see if it has changed
   */
  insomniac = "insomniac",
  /**
   *  Neutral. Wants to be lynched in the trial. If the jester wins, everyone else loses
   */
  jester = "jester",
  /*
   * Neutral. Wins if the jester wins, unless there is no jester, in which case they win if they die.
   * They see the jester if they are in play at the start.
   */
  apprenticeJester = "apprentice jester",
  /**
   * Neutral role. If they die, everyone else wins (both ww and town) except for the jester/apprenticeJester.
   * Their win condition is to survive. They get to look at 2 cards from the middle.
   */
  serialKiller = "serial killer",
  /*
   * Neutral role. Gets given a target, and wins if and only if that target dies.
   * Cannot be swapped by transporter. Can be robbed, but remains an executioner.
   * The robber also becomes an executioner with the same target.
   * Doppleganger will be given the same target.
   * Drunk roles will be told if they are executioner and given their target.
   * An executioner can receive themselves as a target.
   */
  executioner = "executioner",
  /*
   * Neutral role. Gets given a target, and wins if and only if that target survives.
   * Cannot be swapped by transporter. Can be robbed, but remains a guardian angel.
   * The robber becomes a guardian angel with the same target.
   * Doppleganger will be given the same target.
   * Drunk roles will be told if they are guardian angel and given their target.
   * A guardian angel can receive themselves as a target.
   */
  guardianAngel = "guardian angel",
  /*
   * Town role. Picks two lovers. Lovers win only if their lover is not killed. This is in addition
   * to their other win condition. Lovers are not told what their partner's role is.
   * All executioner's targets will become the cupid if any executioner's target is their lover.
   * Love is permanent and does not change when people are swapped.
   */
  cupid = "cupid",
}

enum Alignment {
  werewolf = "werewolf",
  town = "town",
  jester = "jester",
}
const defaultThreePlayer = [
  Roles.werewolf,
  Roles.werewolf,
  Roles.seer,
  Roles.robber,
  Roles.transporter,
  Roles.drunk,
];
const defaultFourPlayer = [
  Roles.werewolf,
  Roles.werewolf,
  Roles.seer,
  Roles.robber,
  Roles.troublemaker,
  Roles.drunk,
  Roles.insomniac,
];
const defaultFivePlayer = [
  Roles.werewolf,
  Roles.werewolf,
  Roles.seer,
  Roles.robber,
  Roles.troublemaker,
  Roles.drunk,
  Roles.insomniac,
  Roles.jester,
];
const defaultSixPlayer = [
  Roles.doppleganger,
  Roles.werewolf,
  Roles.werewolf,
  Roles.seer,
  Roles.robber,
  Roles.troublemaker,
  Roles.drunk,
  Roles.insomniac,
  Roles.jester,
];
const defaultSevenPlayer = [
  Roles.doppleganger,
  Roles.werewolf,
  Roles.werewolf,
  Roles.seer,
  Roles.robber,
  Roles.troublemaker,
  Roles.drunk,
  Roles.insomniac,
  Roles.jester,
  Roles.villager,
];
const defaultEightPlayer = [
  Roles.doppleganger,
  Roles.werewolf,
  Roles.werewolf,
  Roles.seer,
  Roles.robber,
  Roles.troublemaker,
  Roles.drunk,
  Roles.mason,
  Roles.mason,
  Roles.jester,
  Roles.minion,
];

export class OneDay extends Game {
  //define new message room
  private playerchat: MessageRoom = new MessageRoom();
  private leftCard: Roles = Roles.undefined;
  private middleCard: Roles = Roles.undefined;
  private rightCard: Roles = Roles.undefined;
  private time: number = 0;
  private minutes: number = 1;
  private length: number = 10;
  private trial: boolean = false;
  private won: boolean = false;
  private threePlayer = defaultThreePlayer;
  private fourPlayer = defaultFourPlayer;
  private fivePlayer = defaultFivePlayer;
  private sixPlayer = defaultSixPlayer;
  private sevenPlayer = defaultSevenPlayer;
  private eightPlayer = defaultEightPlayer;
  public readonly players: Array<OneDayPlayer> = [];
  public constructor(server: Server, name: string, uid: string) {
    super(
      server,
      3,
      8,
      "OneDay",
      name,
      uid,
      "OpenWerewolf-OneDay",
      "James Craster",
      "Apache-2.0",
    );
    super.addMessageRoom(this.playerchat);
  }
  public resendData() { }
  private getPlayersWithInitialRole(role: string) {
    let players = [];
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].actionRole == role) {
        players.push(this.players[i]);
      }
    }
    return players;
  }

  private getPlayersWithInitialRoleInArray(
    players: Array<OneDayPlayer>,
    role: string,
  ) {
    let out = [];
    for (let i = 0; i < players.length; i++) {
      if (players[i].actionRole == role) {
        out.push(players[i]);
      }
    }
    return out;
  }

  private getRandomPlayerExcludingPlayer(index: number) {
    let randomvar = Math.floor(Math.random() * (this.players.length - 1));
    if (randomvar >= this.players.length - 1) {
      randomvar = this.players.length - 2;
    }
    let temporaryArray = this.players.slice();
    temporaryArray.splice(index, 1);
    return temporaryArray[randomvar];
  }

  public addUser(user: User) {
    super.addUser(user);
    this.playerchat.addUser(user);
  }

  private winResolution(): number {
    let showWinWait = 7000;

    //cancel all voting effects
    for (let i = 0; i < this.players.length; i++) {
      this.players[i].user.cancelVoteEffect();
    }

    //ban voting
    for (let i = 0; i < this.users.length; i++) {
      this.users[i].cannotVote();
    }

    //if no players are around, stop here
    if (this.users.length == 0) {
      return 0;
    }

    //tally up all the votes
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].vote != "") {
        for (let j = 0; j < this.players.length; j++) {
          if (this.players[j].user.username == this.players[i].vote) {
            this.players[j].voteCount++;
            this.playerchat.broadcast(
              this.players[i].user.username +
              " voted for " +
              this.players[j].user.username +
              ".",
            );
          }
        }
      }
    }
    let noMoreThanOne = true;
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].voteCount > 1) {
        noMoreThanOne = false;
      }
    }
    let winningTeam = "";
    let losers: Array<User> = [];
    if (noMoreThanOne) {
      this.playerchat.broadcast("No-one was hanged.");
      showWinWait = 3000;
      this.headerBroadcast([
        { text: "No-one was hanged", color: Colors.white },
      ]);
      let noWolves = true;
      for (let i = 0; i < this.players.length; i++) {
        if (
          this.players[i].role == Roles.werewolf ||
          this.players[i].role == Roles.minion
        ) {
          noWolves = false;
        }
      }
      if (noWolves) {
        winningTeam = Alignment.town;
      } else {
        winningTeam = Alignment.werewolf;
      }
    } else {
      //pick the player(s) with the most votes and call them the loser(s)
      let maxVoteCount = 0;
      let losers: Array<OneDayPlayer> = [];
      for (let i = 0; i < this.players.length; i++) {
        if (this.players[i].voteCount > maxVoteCount) {
          maxVoteCount = this.players[i].voteCount;
        }
      }
      for (let i = 0; i < this.players.length; i++) {
        if (this.players[i].voteCount == maxVoteCount) {
          losers.push(this.players[i]);
          this.players[i].hanged = true;
        }
      }
      setTimeout(() => {
        for (let j = 0; j < this.players.length; j++) {
          //start the hanging animation. If there are multiple targets in a tie,
          //they will both disappear and be hung.
          //get the usernames of the lynch targets:
          let losersUsernames: Array<string> = [];
          for (let i = 0; i < losers.length; i++) {
            losersUsernames.push(losers[i].user.username);
          }
          //do the hanging
          for (let loser of losersUsernames) {
            this.markAsDead(loser);
          }
          this.players[j].user.hang(losersUsernames);
        }
      }, 1000);

      //increase the wait until showing the win by 6000ms for each target (not including the first one)
      showWinWait += (losers.length - 1) * 6000;

      let showPlayerWait: number = 1000;
      for (let i = 0; i < losers.length; i++) {
        setTimeout(() => {
          this.playerchat.broadcast(
            losers[i].user.username + " has been hanged.",
          );
          this.headerBroadcast([
            { text: losers[i].user.username, color: losers[i].user.color },
            { text: " has been hanged", color: Colors.white },
          ]);
          setTimeout(() => {
            if (losers[i].role == Roles.jester) {
              this.playerchat.broadcast(
                losers[i].user.username + " was a " + losers[i].role + ".",
              );
              this.headerBroadcast([
                { text: losers[i].user.username, color: losers[i].user.color },
                { text: " was a ", color: Colors.white },
                { text: losers[i].role, color: Colors.brightYellow },
              ]);
            } else if (
              losers[i].role == Roles.werewolf ||
              losers[i].role == Roles.minion
            ) {
              this.playerchat.broadcast(
                losers[i].user.username + " was a " + losers[i].role + ".",
              );
              this.headerBroadcast([
                { text: losers[i].user.username, color: losers[i].user.color },
                { text: " was a ", color: Colors.white },
                { text: losers[i].role, color: Colors.brightRed },
              ]);
            } else {
              this.playerchat.broadcast(
                losers[i].user.username + " was a " + losers[i].role + ".",
              );
              this.headerBroadcast([
                { text: losers[i].user.username, color: losers[i].user.color },
                { text: " was a ", color: Colors.white },
                { text: losers[i].role, color: Colors.brightGreen },
              ]);
            }
          }, 3000);
        }, showPlayerWait);
        showPlayerWait += 6000;
      }
      for (let i = 0; i < losers.length; i++) {
        if (losers[i].role == Roles.jester) {
          winningTeam = Alignment.jester;
        }
      }
      for (let i = 0; i < losers.length; i++) {
        if (losers[i].role == Roles.werewolf && winningTeam == "") {
          winningTeam = Alignment.town;
        }
      }
      if (winningTeam == "") {
        winningTeam = Alignment.werewolf;
      }
    }
    setTimeout(() => {
      if (winningTeam == Alignment.town) {
        this.playerchat.broadcast(
          "The town has won! Everyone else loses.",
          undefined,
          Colors.green,
        );
        for (let i = 0; i < this.players.length; i++) {
          if (
            this.players[i].role != Roles.jester &&
            this.players[i].role != Roles.werewolf &&
            this.players[i].role != Roles.minion
          ) {
            this.players[i].user.send("*** YOU WIN! ***", Colors.brightGreen);
            this.players[i].user.headerSend([
              { text: "*** YOU WIN ***", color: Colors.brightGreen },
            ]);
          } else {
            this.users[i].send("*** YOU LOSE! ***", Colors.brightRed);
            this.users[i].headerSend([
              { text: "*** YOU LOSE ***", color: Colors.brightRed },
            ]);
          }
        }
      } else if (winningTeam == Alignment.werewolf) {
        this.playerchat.broadcast(
          "The werewolves have won! Everyone else loses.",
          undefined,
          Colors.red,
        );
        for (let i = 0; i < this.players.length; i++) {
          if (
            this.players[i].role == Roles.werewolf ||
            this.players[i].role == Roles.minion
          ) {
            this.players[i].user.send("*** YOU WIN! ***", Colors.brightGreen);
            this.players[i].user.headerSend([
              { text: "*** YOU WIN ***", color: Colors.brightGreen },
            ]);
          } else {
            this.players[i].user.send("*** YOU LOSE! ***", Colors.brightRed);
            this.players[i].user.headerSend([
              { text: "*** YOU LOSE ***", color: Colors.brightRed },
            ]);
          }
        }
      } else if (winningTeam == Alignment.jester) {
        this.playerchat.broadcast(
          "The jester has won! Everyone else loses.",
          undefined,
          Colors.yellow,
        );
        for (let i = 0; i < this.players.length; i++) {
          if (
            this.players[i].role == Roles.jester &&
            this.players[i].hanged == true
          ) {
            this.players[i].user.send("*** YOU WIN! ***", Colors.brightGreen);
            this.players[i].user.headerSend([
              { text: "*** YOU WIN ***", color: Colors.brightGreen },
            ]);
          } else {
            this.players[i].user.send("*** YOU LOSE! ***", Colors.brightRed);
            this.players[i].user.headerSend([
              { text: "*** YOU LOSE ***", color: Colors.brightRed },
            ]);
          }
        }
      }
      //print out all the list of who had what role and whether their role changed at all
      for (let i = 0; i < this.players.length; i++) {
        this.playerchat.broadcast(
          this.players[i].user.username +
          " started as a " +
          this.players[i].initialRole +
          " and became a " +
          this.players[i].role +
          ".",
        );
      }
    }, showWinWait);
    return showWinWait;
  }

  protected update() {
    //if game is running
    if (this.inPlay && this.time != 0) {
      //if players have all left, end the game
      if (this.users.length == 0) {
        this.end();
      }
      //if players all voted early
      if (this.everyoneVoted() && this.won == false) {
        this.playerchat.broadcast("Everyone has voted, so the game has ended.");
        let showWinWait = this.winResolution();
        this.won = true;
        //wait until after win is declared to end the game
        setTimeout(() => {
          this.end();
        }, showWinWait + 3000);
      }
      //notify players of time left every minute
      if (
        Date.now() - this.time > this.minutes * 1000 * 60 &&
        this.minutes != this.length &&
        !this.won
      ) {
        this.playerchat.broadcast(
          "There are " +
          (this.length - this.minutes).toString() +
          " minutes remaining.",
        );
        this.minutes += 2;
      } else if (
        Date.now() - this.time > this.length * 60 * 1000 + 30 * 1000 &&
        !this.won
      ) {
        this.winResolution();
        this.won = true;
        setTimeout(() => {
          this.end();
        }, 10000);
        //notify players of last 30 seconds
      } else if (
        Date.now() - this.time > this.length * 60 * 1000 &&
        !this.trial &&
        !this.won
      ) {
        this.trial = true;
        this.playerchat.broadcast("You have 30 seconds left to vote!");
      }
    }
  }

  protected end() {
    //reset inital conditions
    this.leftCard = Roles.undefined;
    this.middleCard = Roles.undefined;
    this.rightCard = Roles.undefined;
    this.time = 0;
    this.minutes = 1;
    this.trial = false;
    this.won = false;
    this.afterEnd();
  }
  //returns true if everyone voted
  private everyoneVoted() {
    let out = true;
    for (let i = 0; i < this.players.length; i++) {
      //if someone hasn't voted and isn't disconnected, return false
      if (
        (this.players[i].vote == "" || this.players[i].vote == undefined) &&
        !this.players[i].user.disconnected
      ) {
        console.log("false");
        return false;
      }
    }
    //if no players, return false
    if (this.users.length == 0) {
      return false;
    }
    return out;
  }
  protected start() {
    this.beforeStart();
    //do not allow players to select someone to vote for, until discussion phase:
    for (let i = 0; i < this.users.length; i++) {
      this.users[i].cannotVote();
    }
    setTimeout(() => {
      this.setAllTime((this.length + 0.5) * 60000, 30000);
      //shuffle the deck and hand out roles to players
      let roleList: Array<Roles> = [];
      let randomDeck: Array<Roles> = [];
      switch (this.users.length) {
        case 3:
          roleList = this.threePlayer;
          break;
        case 4:
          roleList = this.fourPlayer;
          break;
        case 5:
          roleList = this.fivePlayer;
          break;
        case 6:
          roleList = this.sixPlayer;
          break;
        case 7:
          roleList = this.sevenPlayer;
          break;
        case 8:
          roleList = this.eightPlayer;
          break;
      }
      for (let i = 0; i < this.users.length; i++) {
        for (let j = 0; j < roleList.length; j++) {
          if (roleList[j] == Roles.minion || roleList[j] == Roles.werewolf) {
            this.users[i].leftSend(roleList[j], Colors.brightRed);
          } else if (roleList[j] == Roles.jester) {
            this.users[i].leftSend(roleList[j], Colors.brightYellow);
          } else {
            this.users[i].leftSend(roleList[j], Colors.brightGreen);
          }
        }
      }
      randomDeck = Utils.shuffle(roleList);
      //mute everyone in the player chat
      this.playerchat.muteAll();
      this.playerchat.broadcast(
        "If your card is swapped, you become the role on your new card. You don't act again.",
      );
      this.playerchat.broadcast(
        "Your card may be swapped without you realising.",
      );
      this.playerchat.broadcast(
        "There are 3 cards in the center that no-one has, one left, one middle, one right.",
      );
      this.playerchat.broadcast(
        this.length +
        " minutes remain. You can secretly vote to kill someone at any time by clicking on that player. If everyone votes, the game ends early.",
      );
      this.playerchat.broadcast(
        "In the trial, if a werewolf is killed, the town team win. If no werewolves are killed, the werewolves win. If the " +
        "jester is killed, the jester wins, and everyone else loses.",
      );
      //for debugging purposes, you can choose the deck:
      //randomDeck = [Roles.seer, Roles.werewolf, Roles.transporter, Roles.werewolf, Roles.villager, Roles.transporter];
      for (let i = 0; i < this.users.length; i++) {
        if (randomDeck[i] == Roles.werewolf || randomDeck[i] == Roles.minion) {
          this.users[i].send(
            "ROLE: You are a " + randomDeck[i] + ".",
            undefined,
            Colors.red,
          );
          this.users[i].send(
            "AIM: You want all the werewolves to survive the trial.",
            undefined,
            Colors.red,
          );
          this.users[i].headerSend([
            { text: "You are a ", color: Colors.white },
            { text: randomDeck[i], color: Colors.brightRed },
          ]);
        } else if (randomDeck[i] == Roles.jester) {
          this.users[i].send(
            "ROLE: You are a " + randomDeck[i] + ".",
            undefined,
            Colors.yellow,
          );
          this.users[i].send(
            "AIM: You want to die in the trial",
            undefined,
            Colors.yellow,
          );
          this.users[i].headerSend([
            { text: "You are a ", color: Colors.white },
            { text: randomDeck[i], color: Colors.brightYellow },
          ]);
        } else {
          this.users[i].send(
            "ROLE: You are a " + randomDeck[i] + ".",
            undefined,
            Colors.green,
          );
          this.users[i].send(
            "AIM: You want a werewolf to die in the trial.",
            undefined,
            Colors.green,
          );
          this.users[i].headerSend([
            { text: "You are a ", color: Colors.white },
            { text: randomDeck[i], color: Colors.brightGreen },
          ]);
        }
        //each player starts with three roles, the initialRole, the actionRole and the role.
        //initalRole is constant, the first role the player receives.
        //actionRole dictates when the player wakes up during the night. Only Doppleganger/Amnesiac change it.
        //role changes if the player is robbed/transported etc
        this.players.push(new OneDayPlayer(this.users[i], randomDeck[i]));
      }
      this.playerchat.broadcast('Read the full rules by typing "/rules".');
      setTimeout(() => {
        //assign three cards in the middle
        this.leftCard = randomDeck[randomDeck.length - 1];
        this.middleCard = randomDeck[randomDeck.length - 2];
        this.rightCard = randomDeck[randomDeck.length - 3];
        this.playerchat.broadcast("*** YOUR ACTION ***", Colors.brightGreen);
        this.headerBroadcast([
          { text: "*** YOUR ACTION ***", color: Colors.brightGreen },
        ]);
        //perform player actions
        this.nightActions();
        setTimeout(() => {
          //unmute and everyone in the player chat
          this.playerchat.unmuteAll();
          //start timer
          this.time = Date.now();
          this.playerchat.broadcast("*** DISCUSSION ***", Colors.brightGreen);
          setInterval(() => { }, 4000);
          for (let i = 0; i < this.users.length; i++) {
            this.users[i].headerSend([
              { text: "*** DISCUSSION ***", color: Colors.brightGreen },
            ]);
          }
          //allow players to select someone to vote for
          for (let i = 0; i < this.users.length; i++) {
            this.users[i].canVote();
          }
        }, 4000);
      }, 4000);
    }, 3000);
  }

  private nightActions(): void {
    let randomvar = 0;
    let temporaryArray = [];
    //doppleganger
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].actionRole == Roles.doppleganger) {
        this.players[i].user.send(
          "You look at another player's card, and become that role.",
        );
        let target = this.getRandomPlayerExcludingPlayer(i);
        this.players[i].user.send(
          "You look at " + target.user.username + "'s card.",
        );
        this.players[i].user.send(
          target.user.username + " is a " + target.actionRole + ".",
        );
        this.players[i].user.send("You are now a " + target.actionRole + ".");
        this.players[i].actionRole = target.actionRole;
        this.players[i].role = this.players[i].actionRole;
      }
    }
    //amnesiac
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].actionRole == Roles.amnesiac) {
        this.players[i].user.send(
          "You look at a card from the center, and become that role.",
        );
        switch (Math.floor(Math.random() * 3)) {
          case 0:
            this.players[i].user.send("You look at the leftmost card.");
            this.players[i].user.send(
              "The leftmost card is a " + this.leftCard + ".",
            );
            this.players[i].user.send("You are now a " + this.leftCard + ".");
            this.players[i].actionRole = this.leftCard;
            break;
          case 1:
            this.players[i].user.send("You look at the middle card.");
            this.players[i].user.send(
              "The middle card is a " + this.middleCard + ".",
            );
            this.players[i].user.send("You are now a " + this.middleCard + ".");
            this.players[i].actionRole = this.middleCard;
            break;
          case 2:
            this.players[i].user.send("You look at the rightmost card.");
            this.players[i].user.send(
              "The rightmost card is a " + this.rightCard + ".",
            );
            this.players[i].user.send("You are now a " + this.rightCard + ".");
            this.players[i].actionRole = this.rightCard;
            break;
        }
        this.players[i].role = this.players[i].actionRole;
      }
    }
    //amnesiac turned doppleganger
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].actionRole == Roles.doppleganger) {
        this.players[i].user.send(
          "You look at another player's card, and become that role.",
        );
        let target = this.getRandomPlayerExcludingPlayer(i);
        this.players[i].user.send(
          "You look at " + target.user.username + "'s card.",
        );
        this.players[i].user.send(
          target.user.username + " is a " + target.actionRole,
        );
        this.players[i].user.send("You are now a " + target.actionRole);
        this.players[i].actionRole = target.actionRole;
        this.players[i].role = this.players[i].actionRole;
      }
    }

    //masons
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].actionRole == Roles.mason) {
        temporaryArray = this.players.slice();
        temporaryArray.splice(i, 1);
        let masons = this.getPlayersWithInitialRoleInArray(
          temporaryArray,
          Roles.mason,
        );
        this.players[i].user.send("You see if there are other masons.");
        if (masons.length == 2) {
          this.players[i].user.send("There are three masons.");
          this.players[i].user.send(
            "Your mason partners are " +
            masons[0].user.username +
            " and " +
            masons[1].user.username +
            ".",
          );
        } else if (masons.length == 1) {
          this.players[i].user.send("There are two masons.");
          this.players[i].user.send(
            "Your mason partner is " + masons[0].user.username + ".",
          );
        } else {
          this.players[i].user.send("You are the only mason.");
        }
      }
    }
    for (let i = 0; i < this.players.length; i++) {
      let werewolves = [];
      switch (this.players[i].actionRole) {
        //tell the minion who the werewolves are
        case Roles.minion:
          werewolves = this.getPlayersWithInitialRole(Roles.werewolf);
          this.players[i].user.send(
            "You look to see if there are any werewolves.",
          );
          if (werewolves.length == 0) {
            this.players[i].user.send("There are no werewolves.");
          } else if (werewolves.length == 1) {
            this.players[i].user.send("There is one werewolf.");
            this.players[i].user.send(
              "The werewolf is " + werewolves[0].user.username + ".",
            );
          } else {
            this.players[i].user.send("The werewolves are: ");
            for (let i = 0; i < werewolves.length; i++) {
              this.players[i].user.send(werewolves[i] + " is a werewolf.");
            }
          }
          this.players[i].user.send(
            "Tommorrow, help the werewolves survive. You can die without consequences.",
          );
          break;
        //tell the werewolves who the other werewolf is.
        case Roles.werewolf:
          temporaryArray = this.players.slice();
          temporaryArray.splice(i, 1);
          werewolves = this.getPlayersWithInitialRoleInArray(
            temporaryArray,
            Roles.werewolf,
          );
          this.players[i].user.send(
            "You look to see if there are other wolves.",
          );
          if (werewolves.length == 2) {
            this.players[i].user.send("There are three werewolves.");
            this.players[i].user.send(
              "Your werewolf partners are " +
              werewolves[0].user.username +
              " and " +
              werewolves[1].user.username +
              ".",
            );
            this.players[i].user.send(
              "Try not to be suspicious! You must all pretend to be something else.",
            );
          } else if (werewolves.length == 1) {
            this.players[i].user.send("There are two werewolves.");
            this.players[i].user.send(
              "Your werewolf partner is '" + werewolves[0].user.username + "'.",
            );
            this.players[i].user.send(
              "Try not to be suspicious! You and your partner must pretend to be something else.",
            );
          } else {
            this.players[i].user.send("You are the only werewolf.");
            this.players[i].user.send(
              "Try not to be suspicious! Pretend to be something else.",
            );
          }
          break;
        //swap the robber's card with someone elses and tell them their new card
        case Roles.robber:
          let randomPlayer = this.getRandomPlayerExcludingPlayer(i);
          this.players[i].user.send("You swap your card with someone else's.");
          this.players[i].user.send(
            "You swapped your card with '" +
            randomPlayer.user.username +
            "' who was a " +
            randomPlayer.role +
            ".",
          );
          if (
            randomPlayer.role == Roles.werewolf ||
            randomPlayer.role == Roles.minion
          ) {
            this.players[i].user.send(
              "You are now a " + randomPlayer.role + ".",
              undefined,
              Colors.red,
            );
          } else if (randomPlayer.role == Roles.jester) {
            this.players[i].user.send(
              "You are now a " + randomPlayer.role + ".",
              undefined,
              Colors.yellow,
            );
          } else {
            this.players[i].user.send(
              "You are now a " + randomPlayer.role + ".",
              undefined,
              Colors.green,
            );
          }
          this.players[i].user.send(
            "'" + randomPlayer.user.username + "' is now a robber.",
          );
          if (randomPlayer.role == Roles.werewolf) {
            this.players[i].user.send(
              "Try not to be suspicious! Pretend you're not a werewolf.",
            );
          }
          this.players[i].role = randomPlayer.role;
          randomPlayer.role = Roles.robber;
          break;
        //tell the seer 2 of the center cards at random
        case Roles.seer:
          this.players[i].user.send(
            "There are 3 cards in the center of the table, one left, one middle and one right.",
          );
          this.players[i].user.send("You look at two cards in the center.");
          let cardArray = ["left", "middle", "right"];
          let combo = Utils.chooseCombination(cardArray, 2);
          if (combo.indexOf("left") != -1) {
            this.players[i].user.send(
              "You look at the left card. The left card is a " +
              this.leftCard +
              ".",
            );
          }
          if (combo.indexOf("middle") != -1) {
            this.players[i].user.send(
              "You look at the middle card. The middle card is a " +
              this.middleCard +
              ".",
            );
          }
          if (combo.indexOf("right") != -1) {
            this.players[i].user.send(
              "You look at the right card. The right card is a " +
              this.rightCard +
              ".",
            );
          }
          break;
        case Roles.villager:
          this.players[i].user.send(
            "You are a villager, so you do nothing. Goodnight!",
          );
          break;
        case Roles.jester:
          this.players[i].user.send("You are the jester, so you do nothing.");
          this.players[i].user.send(
            "You want to be killed in the trial. Act as suspiciously as possible!",
          );
          break;
      }
    }
    //transporter
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].actionRole == Roles.transporter) {
        let combo = Utils.chooseCombination(this.players, 2);
        let firstTarget = combo[0];
        let secondTarget = combo[1];
        if (firstTarget.user.equals(this.players[i].user)) {
          this.players[i].user.send(
            "You swapped your own card with " +
            secondTarget.user.username +
            "'s card.",
          );
        } else if (secondTarget.user.equals(this.players[i].user)) {
          this.players[i].user.send(
            "You swapped your own card with " +
            firstTarget.user.username +
            "'s card.",
          );
        } else {
          this.players[i].user.send(
            "You swapped '" +
            firstTarget.user.username +
            "''s card with '" +
            secondTarget.user.username +
            "''s card.",
          );
        }
        let temporaryRole = firstTarget.role;
        firstTarget.role = secondTarget.role;
        secondTarget.role = temporaryRole;
      }
    }
    //troublemaker
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].actionRole == Roles.troublemaker) {
        temporaryArray = this.players.slice();
        //remove the troublemaker from the array
        temporaryArray.splice(i, 1);
        let combo = Utils.chooseCombination(temporaryArray, 2);
        let firstTarget = combo[0];
        let secondTarget = combo[1];
        this.players[i].user.send(
          "You swapped '" +
          firstTarget.user.username +
          "''s card with '" +
          secondTarget.user.username +
          "''s card.",
        );
        let temporaryRole = firstTarget.role;
        firstTarget.role = secondTarget.role;
        secondTarget.role = temporaryRole;
      }
    }
    //drunk
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].actionRole == Roles.drunk) {
        randomvar = Math.floor(Math.random() * 3);
        this.players[i].user.send(
          "There are 3 cards in the center of the table: one left, one middle and one right.",
        );
        switch (randomvar) {
          case 0:
            this.players[i].user.send(
              "You took the leftmost card from the center and swapped it with your own.",
            );
            this.players[i].role = this.leftCard;
            break;
          case 1:
            this.players[i].user.send(
              "You took the middle card from the center and swapped it with your own.",
            );
            this.players[i].role = this.middleCard;
            break;
          case 2:
            this.players[i].user.send(
              "You took the rightmost card from the center and swapped it with your own.",
            );
            this.players[i].role = this.rightCard;
            break;
        }
      }
    }
    //insomniac
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].actionRole == Roles.insomniac) {
        this.players[i].user.send(
          "It is the end of the night. You look at your card.",
        );
        if (this.players[i].role == Roles.insomniac) {
          this.players[i].user.send(
            "Your card has not changed. You are still an insomniac.",
            undefined,
            Colors.green,
          );
        } else {
          if (
            this.players[i].role == Roles.werewolf ||
            this.players[i].role == Roles.minion
          ) {
            this.players[i].user.send(
              "Your card has been swapped by somebody. You are now a " +
              this.players[i].role +
              ".",
              undefined,
              Colors.red,
            );
          } else if (this.players[i].role == Roles.jester) {
            this.players[i].user.send(
              "Your card has been swapped by somebody. You are now a " +
              this.players[i].role +
              ".",
              undefined,
              Colors.yellow,
            );
            this.players[i].user.send(
              "Tomorrow, you want to be killed in the trial. Act as suspiciously as possible!",
            );
          } else {
            this.players[i].user.send(
              "Your card has been swapped by somebody. You are now a " +
              this.players[i].role +
              ".",
              undefined,
              Colors.green,
            );
          }
        }
        if (this.players[i].role == Roles.werewolf) {
          this.players[i].user.send(
            "Try not to be suspicious! Pretend that you are not a werewolf.",
          );
        }
      }
    }
  }
  public customAdminReceive(player: User, msg: string): void {
    if (Utils.isCommand(msg, "!roundtime")) {
      player.send(this.length.toString());
    } else if (Utils.isCommand(msg, "!sround")) {
      this.length = parseInt(msg.slice(8));
    } else if (Utils.isCommand(msg, "!yell") && player.admin == true) {
      this.broadcast("ADMIN:" + msg.slice(5), Colors.brightGreen);
    }
    if (!this.inPlay) {
      if (Utils.isCommand(msg, "!show")) {
        switch (Utils.commandArguments(msg)[0]) {
          case "3":
            player.send(this.threePlayer.toString());
            break;
          case "4":
            player.send(this.fourPlayer.toString());
            break;
          case "5":
            player.send(this.fivePlayer.toString());
            break;
          case "6":
            player.send(this.sixPlayer.toString());
            break;
          case "7":
            player.send(this.sevenPlayer.toString());
            break;
          case "8":
            player.send(this.eightPlayer.toString());
            break;
          default:
            player.send(
              "Error: number of players is missing or incorrect." +
              " Example usage: !show 5 will show the rolelist for 5 players",
              Colors.brightRed,
            );
            break;
        }
        //set the rolelist before the game begins
      } else if (Utils.isCommand(msg, "!set")) {
        let newlist: Array<string> = [];
        switch (Utils.commandArguments(msg)[0]) {
          case "3":
            this.threePlayer = this.parseRoleString(msg.slice(7, 7 + 6));
            break;
          case "4":
            this.fourPlayer = this.parseRoleString(msg.slice(7, 7 + 7));
            break;
          case "5":
            this.fivePlayer = this.parseRoleString(msg.slice(7, 7 + 8));
            break;
          case "6":
            this.sixPlayer = this.parseRoleString(msg.slice(7, 7 + 9));
            break;
          case "7":
            this.sevenPlayer = this.parseRoleString(msg.slice(7, 7 + 10));
            break;
          case "8":
            this.eightPlayer = this.parseRoleString(msg.slice(7, 7 + 11));
            break;
          default:
            player.send(
              "Error: number of players is missing or incorrect." +
              " Example usage: !set 5 ... will set the rolelist for 5 players",
              Colors.brightRed,
            );
        }
        //reset rolelist to default if there has been a messup
      } else if (Utils.isCommand(msg, "!default")) {
        switch (Utils.commandArguments(msg)[0]) {
          case "3":
            this.threePlayer = defaultThreePlayer;
            break;
          case "4":
            this.fourPlayer = defaultFourPlayer;
            break;
          case "5":
            this.fivePlayer = defaultFivePlayer;
            break;
          case "6":
            this.sixPlayer = defaultSixPlayer;
            break;
          case "7":
            this.sevenPlayer = defaultSevenPlayer;
            break;
          case "8":
            this.eightPlayer = defaultEightPlayer;
            break;
          default:
            player.send(
              "Error: number of players is missing or incorrect." +
              " Example usage: !default 5 will show the rolelist for 5 players",
              Colors.brightRed,
            );
            break;
        }
      } else if (Utils.isCommand(msg, "!gamehelp")) {
        player.send(
          "!roundtime !sround !stop, !start, !resume, !restart, !time, !hold," +
          " !release, !show, !set, !default, !yell, !help",
          undefined,
          Colors.green,
        );
      }
    }
  }
  //convert a string into an array of roles, e.g
  // 'dwa' becomes [doppleganger, werewolf, amnesiac]
  private parseRoleString(roleString: string): Array<Roles> {
    let out: Array<Roles> = [];
    for (let i = 0; i < roleString.length; i++) {
      switch (roleString[i]) {
        case "m":
          out.push(Roles.mason);
          break;
        case "b":
          out.push(Roles.troublemaker);
          break;
        case "w":
          out.push(Roles.werewolf);
          break;
        case "a":
          out.push(Roles.amnesiac);
          break;
        case "d":
          out.push(Roles.doppleganger);
          break;
        case "s":
          out.push(Roles.seer);
          break;
        case "r":
          out.push(Roles.robber);
          break;
        case "t":
          out.push(Roles.transporter);
          break;
        case "i":
          out.push(Roles.insomniac);
          break;
        case "j":
          out.push(Roles.jester);
          break;
        case "u":
          out.push(Roles.drunk);
          break;
        case "v":
          out.push(Roles.villager);
          break;
        case "n":
          out.push(Roles.minion);
          break;
        default:
          out.push(Roles.villager);
          break;
      }
    }
    return out;
  }
  private getPlayer(id: string) {
    return this.players.find(player => player.user.id == id);
  }
  /**
   * Processes a message typed into the client by a player.
   *
   * @param {string} id The id of the sender of the message.
   * @param {string} msg The message the sender sent to the game.
   * @memberof OneDay
   */
  public receive(user: User, msg: string): void {
    //receive in-game commands from players if game is running
    let player = this.getPlayer(user.id);
    if (player) {
      if (msg[0] == "/" && this.inPlay) {
        if (Utils.isCommand(msg, "/vote")) {
          let username = msg.slice(5).trim();
          let exists = false;
          for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].user.username == username) {
              player.user.send(
                "Your vote for '" + username + "' has been received",
              );
              player.user.selectUser(username);
              player.vote = username;
              exists = true;
            }
          }
          if (!exists) {
            player.user.send(
              "There's no player called '" + username + "'. Vote not changed.",
            );
          }
        } else if (Utils.isCommand(msg, "/unvote") && player.vote != "") {
          player.user.send(
            "Your vote for '" + player.vote + "' has been cancelled",
          );
          player.user.cancelVoteEffect();
          player.vote = "";
        } else if (Utils.isCommand(msg, "/unvote") && player.vote == "") {
          player.user.send(
            "You haven't voted for anybody yet, so there is nothing to cancel",
          );
        } else if (Utils.isCommand(msg, "/rules")) {
          player.user.send("*** RULES ***", Colors.brightGreen);
          player.user.send(
            "Everyone has a role on their card. There are also 3 cards in the middle that no one has.",
          );
          player.user.send("During the night each player performs their role.");
          player.user.send(
            "Not all these roles will be in the game: check the role list at the start.",
          );
          player.user.send("First, the werewolves see who each other are.");
          player.user.send("Then the seer looks at two cards in the middle.");
          player.user.send(
            "Then the robber swaps their card with someone else's and looks at it.",
          );
          player.user.send(
            "Then the transporter swaps two people's cards (possibly including themselves).",
          );
          player.user.send(
            "Then the troublemaker swaps two people's cards, excluding themselves.",
          );
          player.user.send(
            "Then the drunk swaps their card with one from the middle without seeing it.",
          );
          player.user.send(
            "Finally, the insomniac looks at their card to see if it changed.",
          );
          player.user.send("The villager does nothing.");
          player.user.send("The jester wants to die.");
          player.user.send(
            "If you card is swapped you become the role on your new card.",
          );
          player.user.send("You may not know that you have been swapped.");
          player.user.send(
            "During the day, everyone votes for someone to die.",
          );
          player.user.send(
            "If a werewolf dies, the town(everyone except the werewolves and the jester) wins.",
          );
          player.user.send(
            "The werewolves win if they survive and the jester doesn't die.",
          );
          player.user.send("The jester wins if they die.");
          player.user.send("*** END RULES ***", Colors.brightGreen);
        } else {
          player.user.send(
            "Error: no such command exists! Commands are /vote /unvote /rules",
          );
        }
      } else {
        console.log("received by player chat");
        this.playerchat.receive(player.user, [
          { text: player.user.username, color: player.user.color },
          { text: ": " + msg },
        ]);
        this.endChat.receive(player.user, [
          { text: player.user.username, color: player.user.color },
          { text: ": " + msg },
        ]);
      }
    } else {
      this.playerchat.receive(user, [
        { text: user.username, color: user.color },
        { text: ": " + msg },
      ]);
      this.endChat.receive(user, [
        { text: user.username, color: user.color },
        { text: ": " + msg },
      ]);
    }
  }
}
