/* 
    Copyright (C) 2017 James V. Craster  

    This file is part of OpenWerewolf:OneDay.  
    OpenWerewolf:OneDay is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, version 3 of the License.
    OpenWerewolf:OneDay is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.
    You should have received a copy of the GNU Affero General Public License
    along with OpenWerewolf:OneDay.  If not, see <http://www.gnu.org/licenses/>.
*/
"use strict";
import { MessageRoom, Game, Server, Player, Utils, RoleList, Colors, Stopwatch } from "../../Core/core";
import { lstat } from "fs";
enum Roles {
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
  cupid = "cupid"


}
/*
These classes are planned to replace the current .data setup
class OneDayPlayer extends Player{
  public data:PlayerData;
  constructor(socket: Socket){
    super(socket);
  }
}
class PlayerData{
  private readonly intialRole:Role;
  private actionRole:Role;
  private finalRole:Role;
}
class Role{
  private readonly name:string;
  private readonly wakesWithWolves:boolean;
  private readonly wakesWithMasons:boolean;
}
*/
enum Alignment {
  werewolf = "werewolf",
  town = "town",
  jester = "jester"
}
const defaultThreePlayer: RoleList = new RoleList([
  Roles.werewolf,
  Roles.werewolf,
  Roles.seer,
  Roles.robber,
  Roles.transporter,
  Roles.drunk
]);
const defaultFourPlayer: RoleList = new RoleList([
  Roles.werewolf,
  Roles.werewolf,
  Roles.seer,
  Roles.robber,
  Roles.troublemaker,
  Roles.drunk,
  Roles.insomniac
]);
const defaultFivePlayer: RoleList = new RoleList([
  Roles.werewolf,
  Roles.werewolf,
  Roles.seer,
  Roles.robber,
  Roles.troublemaker,
  Roles.drunk,
  Roles.insomniac,
  Roles.jester
]);
const defaultSixPlayer: RoleList = new RoleList([
  Roles.doppleganger,
  Roles.werewolf,
  Roles.werewolf,
  Roles.seer,
  Roles.robber,
  Roles.troublemaker,
  Roles.drunk,
  Roles.insomniac,
  Roles.jester
]);
const defaultSevenPlayer: RoleList = new RoleList([
  Roles.doppleganger,
  Roles.werewolf,
  Roles.werewolf,
  Roles.seer,
  Roles.robber,
  Roles.troublemaker,
  Roles.drunk,
  Roles.insomniac,
  Roles.jester,
  Roles.villager
]);

export class OneDay extends Game {
  //define new message room
  private playerchat: MessageRoom = new MessageRoom();
  private leftCard: string = "";
  private middleCard: string = "";
  private rightCard: string = "";
  private time: number = 0;
  private minutes: number = 1;
  private length: number = 10;
  private trial: boolean = false;
  private won: boolean = false;
  private threePlayer: RoleList = new RoleList(defaultThreePlayer.list);
  private fourPlayer: RoleList = new RoleList(defaultFourPlayer.list);
  private fivePlayer: RoleList = new RoleList(defaultFivePlayer.list);
  private sixPlayer: RoleList = new RoleList(defaultSixPlayer.list);
  private sevenPlayer: RoleList = new RoleList(defaultSevenPlayer.list);
  public constructor(server: Server) {
    super(server, 3, 7, "OneDay");
    super.addMessageRoom(this.playerchat);
  }

  private getPlayersWithInitialRole(role: string) {
    let players = [];
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].data.actionRole == role) {
        players.push(this.players[i]);
      }
    }
    return players;
  }

  private getPlayersWithInitialRoleInArray(players: Array<Player>, role: string) {
    let out = [];
    for (let i = 0; i < players.length; i++) {
      if (players[i].data.actionRole == role) {
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

  public addPlayer(player: Player) {
    super.addPlayer(player);
    player.data.voteCount = 0;
    player.data.hanged = false;
    this.playerchat.addPlayer(player);
  }


  private winResolution() {

    //if no players are around, stop here
    if (this.players.length == 0) {
      return;
    }

    //tally up all the votes
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].data.vote != "") {
        for (let j = 0; j < this.players.length; j++) {
          if (this.players[j].username == this.players[i].data.vote) {
            this.players[j].data.voteCount++;
            this.playerchat.broadcast(this.players[i].username + " voted for " + this.players[j].username + ".");
          }
        }
      }
    }
    let noMoreThanOne = true;
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].data.voteCount > 1) {
        noMoreThanOne = false;
      }
    }
    let winningTeam = "";
    let losers: Array<Player> = [];
    if (noMoreThanOne) {
      this.playerchat.broadcast("No-one was hanged.");
      let noWolves = true;
      for (let i = 0; i < this.players.length; i++) {
        if (this.players[i].data.role == Roles.werewolf || this.players[i].data.role == Roles.minion) {
          noWolves = false;
        }
      }
      if (noWolves) {
        winningTeam = Alignment.town;
      } else {
        winningTeam = Alignment.werewolf;
      }
    } else {
      //pick the player with the most votes and call them the loser
      let maxVoteCount = 0;
      let losers = [];
      for (let i = 0; i < this.players.length; i++) {
        if (this.players[i].data.voteCount > maxVoteCount) {
          maxVoteCount = this.players[i].data.voteCount;
        }
      }
      for (let i = 0; i < this.players.length; i++) {
        if (this.players[i].data.voteCount == maxVoteCount) {
          losers.push(this.players[i]);
          this.players[i].data.hanged = true;
        }
      }
      for (let i = 0; i < losers.length; i++) {
        this.playerchat.broadcast(losers[i].username + " has been hanged.");
        this.playerchat.broadcast(losers[i].username + " was a " + losers[i].data.role + ".");
      }
      for (let i = 0; i < losers.length; i++) {
        if (losers[i].data.role == Roles.jester) {
          winningTeam = Alignment.jester;
        }
      }
      for (let i = 0; i < losers.length; i++) {
        if (losers[i].data.role == Roles.werewolf && winningTeam == "") {
          winningTeam = Alignment.town;
        }
      }
      if (winningTeam == "") {
        winningTeam = Alignment.werewolf;
      }
    }

    if (winningTeam == Alignment.town) {
      this.playerchat.broadcast("The town has won! Everyone else loses.", undefined, Colors.green);
      for (let i = 0; i < this.players.length; i++) {
        if (this.players[i].data.role != Roles.jester && this.players[i].data.role != Roles.werewolf
          && this.players[i].data.role != Roles.minion) {
          this.players[i].send("*** YOU WIN! ***", Colors.brightGreen);
        } else {
          this.players[i].send("*** YOU LOSE! ***", Colors.brightRed);
        }
      }
    } else if (winningTeam == Alignment.werewolf) {
      this.playerchat.broadcast("The werewolves have won! Everyone else loses.", undefined, Colors.red);
      for (let i = 0; i < this.players.length; i++) {
        if (this.players[i].data.role == Roles.werewolf || this.players[i].data.role == Roles.minion) {
          this.players[i].send("*** YOU WIN! ***", Colors.brightGreen);
        } else {
          this.players[i].send("*** YOU LOSE! ***", Colors.brightRed);
        }
      }
    } else if (winningTeam == Alignment.jester) {
      this.playerchat.broadcast("The jester has won! Everyone else loses.", undefined, Colors.yellow);
      for (let i = 0; i < this.players.length; i++) {
        if (this.players[i].data.role == Roles.jester && this.players[i].data.hanged == true) {
          this.players[i].send("*** YOU WIN! ***", Colors.brightGreen);
        } else {
          this.players[i].send("*** YOU LOSE! ***", Colors.brightRed);
        }
      }
    }
    //print out all the list of who had what role and whether their role changed at all
    for (let i = 0; i < this.players.length; i++) {
      this.playerchat.broadcast(this.players[i].username + " started as a " + this.players[i].data.initialRole +
        " and became a " + this.players[i].data.role + ".");
    }

  }

  protected update() {
    //if game is running
    if (this.inPlay && this.time != 0) {
      //if players have all left, end the game
      if (this.players.length == 0) {
        this.end();
      }
      //if players all voted early
      if (this.everyoneVoted() && this.won == false) {
        this.playerchat.broadcast("Everyone has voted, so the game has ended.");
        this.winResolution();
        this.won = true;
        this.end();
      }
      //notify players of time left every minute
      if (Date.now() - this.time > this.minutes * 1000 * 60 && this.minutes != this.length && !this.won) {
        this.playerchat.broadcast(this.length - this.minutes + " minutes remain until the trial. You can vote at any time using \"/vote username\"");
        this.minutes += 2;
      } else if (Date.now() - this.time > this.length * 60 * 1000 + 30 * 1000 && !this.won) {
        this.winResolution();
        this.end();
        this.won = true;
        //notify players of last 30 seconds
      } else if (Date.now() - this.time > this.length * 60 * 1000 && !this.trial && !this.won) {
        this.trial = true;
        this.playerchat.broadcast("The trial has begun, you have 30 seconds! Vote now using \"/vote username\"");
      }
    }
  }

  protected end() {
    //reset inital conditions
    this.leftCard = "";
    this.middleCard = "";
    this.rightCard = "";
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
      if ((this.players[i].data.vote == "" || this.players[i].data.vote == undefined) && !this.players[i].disconnected) {
        return false;
      }
    }
    //if no players, return false
    if (this.players.length == 0) {
      return false;
    }
    return out;
  }
  protected start() {
    this.beforeStart();
    this.setAllTime((this.length + 0.5) * 60000, 30000);
    //set everyone's vote to blank
    for (let i = 0; i < this.players.length; i++) {
      this.players[i].data.vote = "";
    }
    //shuffle the deck and hand out roles to players
    let roleList: Array<string> = [];
    let randomDeck: Array<string> = [];
    switch (this.players.length) {
      case 3:
        roleList = this.threePlayer.list;
        break;
      case 4:
        roleList = this.fourPlayer.list;
        break;
      case 5:
        roleList = this.fivePlayer.list;
        break;
      case 6:
        roleList = this.sixPlayer.list;
        break;
      case 7:
        roleList = this.sevenPlayer.list;
        break;
    }
    for (let i = 0; i < this.players.length; i++) {
      for (let j = 0; j < roleList.length; j++) {
        if (roleList[j] == Roles.minion || roleList[j] == Roles.werewolf) {
          this.players[i].leftSend(roleList[j], Colors.brightRed);
        } else if (roleList[j] == Roles.jester) {
          this.players[i].leftSend(roleList[j], Colors.brightYellow);
        } else {
          this.players[i].leftSend(roleList[j], Colors.brightGreen);
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
      "There are 3 cards in the center that no-one has, one left, one middle, one right."
    )
    this.playerchat.broadcast(
      this.length + " minutes remain. You can secretly vote to kill someone at any time by typing \"/vote username\"," +
      " e.g \"/vote frank\" secretly casts a vote for frank. Undo your vote " +
      " by typing \"/unvote\". If everyone votes, the game ends early.",
    );
    this.playerchat.broadcast(
      "In the trial, if a werewolf is killed, the town team win. If no werewolves are killed, the werewolves win. If the " +
      "jester is killed, the jester wins, and everyone else loses."
    );
    //for debugging purposes, you can choose the deck:
    //randomDeck = [Roles.seer, Roles.werewolf, Roles.transporter, Roles.werewolf, Roles.villager, Roles.transporter];
    for (let i = 0; i < this.players.length; i++) {
      if (randomDeck[i] == Roles.werewolf || randomDeck[i] == Roles.minion) {
        this.players[i].send(
          "ROLE: You are a " + randomDeck[i] + ".", undefined, Colors.red
        );
        this.players[i].send(
          "AIM: You want all the werewolves to survive the trial.", undefined, Colors.red
        );
      } else if (randomDeck[i] == Roles.jester) {
        this.players[i].send(
          "ROLE: You are a " + randomDeck[i] + ".", undefined, Colors.yellow
        );
        this.players[i].send(
          "AIM: You want to die in the trial", undefined, Colors.yellow
        );
      } else {
        this.players[i].send(
          "ROLE: You are a " + randomDeck[i] + ".", undefined, Colors.green
        );
        this.players[i].send(
          "AIM: You want a werewolf to die in the trial.", undefined, Colors.green
        );
      }
      //each player starts with three roles, the initialRole, the actionRole and the role. 
      //initalRole is constant, the first role the player receives.
      //actionRole dictates when the player wakes up during the night. Only Doppleganger/Amnesiac change it.
      //role changes if the player is robbed/transported etc 
      this.players[i].data.initialRole = randomDeck[i];
      this.players[i].data.role = randomDeck[i];
      this.players[i].data.actionRole = randomDeck[i];
    }
    //assign three cards in the middle
    this.leftCard = randomDeck[randomDeck.length - 1];
    this.middleCard = randomDeck[randomDeck.length - 2];
    this.rightCard = randomDeck[randomDeck.length - 3];

    this.playerchat.broadcast(
      "Read the full rules by typing \"/rules\".",

    );
    this.playerchat.broadcast("*** YOUR ACTION ***", Colors.brightGreen);
    //perform player actions
    this.nightActions();
    //unmute and everyone in the player chat
    this.playerchat.unmuteAll();
    //start timer
    this.time = Date.now();
    this.playerchat.broadcast("*** DISCUSSION ***", Colors.brightGreen);
  }

  private nightActions(): void {
    let randomvar = 0;
    let temporaryArray = [];
    //doppleganger
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].data.actionRole == Roles.doppleganger) {
        this.players[i].send("You look at another player's card, and become that role.");
        let target = this.getRandomPlayerExcludingPlayer(i);
        this.players[i].send("You look at " + target.username + "'s card.");
        this.players[i].send(target.username + " is a " + target.data.actionRole + ".");
        this.players[i].send("You are now a " + target.data.actionRole + ".");
        this.players[i].data.actionRole = target.data.actionRole;
        this.players[i].data.role = this.players[i].data.actionRole;
      }
    }
    //amnesiac
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].data.actionRole == Roles.amnesiac) {
        this.players[i].send("You look at a card from the center, and become that role.");
        switch (Math.floor(Math.random() * 3)) {
          case 0:
            this.players[i].send("You look at the leftmost card.");
            this.players[i].send("The leftmost card is a " + this.leftCard + ".");
            this.players[i].send("You are now a " + this.leftCard + ".");
            this.players[i].data.actionRole = this.leftCard;
            break;
          case 1:
            this.players[i].send("You look at the middle card.");
            this.players[i].send("The middle card is a " + this.middleCard + ".");
            this.players[i].send("You are now a " + this.middleCard + ".");
            this.players[i].data.actionRole = this.middleCard;
            break;
          case 2:
            this.players[i].send("You look at the rightmost card.");
            this.players[i].send("The rightmost card is a " + this.rightCard + ".");
            this.players[i].send("You are now a " + this.rightCard + ".");
            this.players[i].data.actionRole = this.rightCard;
            break;
        }
        this.players[i].data.role = this.players[i].data.actionRole;
      }
    }
    //amnesiac turned doppleganger
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].data.actionRole == Roles.doppleganger) {
        this.players[i].send("You look at another player's card, and become that role.");
        let target = this.getRandomPlayerExcludingPlayer(i);
        this.players[i].send("You look at " + target.username + "'s card.");
        this.players[i].send(target.username + " is a " + target.data.actionRole);
        this.players[i].send("You are now a " + target.data.actionRole);
        this.players[i].data.actionRole = target.data.actionRole;
        this.players[i].data.role = this.players[i].data.actionRole;
      }
    }

    //masons
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].data.actionRole == Roles.mason) {
        temporaryArray = this.players.slice();
        temporaryArray.splice(i, 1);
        let masons = this.getPlayersWithInitialRoleInArray(temporaryArray, Roles.mason);
        this.players[i].send("You see if there are other masons.");
        if (masons.length == 2) {
          this.players[i].send("There are three masons.");
          this.players[i].send(
            "Your mason partners are " + masons[0].username + " and " + masons[1].username + "."
          );
        } else if (masons.length == 1) {
          this.players[i].send("There are two masons.");
          this.players[i].send(
            "Your mason partner is " + masons[0].username + "."
          );
        } else {
          this.players[i].send("You are the only mason.");
        }
      }
    }
    for (let i = 0; i < this.players.length; i++) {
      let werewolves = [];
      switch (this.players[i].data.actionRole) {
        //tell the minion who the werewolves are
        case Roles.minion:
          werewolves = this.getPlayersWithInitialRole(Roles.werewolf);
          this.players[i].send("You look to see if there are any werewolves.");
          if (werewolves.length == 0) {
            this.players[i].send("There are no werewolves.");
          } else if (werewolves.length == 1) {
            this.players[i].send("There is one werewolf.");
            this.players[i].send("The werewolf is " + werewolves[0].username + ".");
          } else {
            this.players[i].send("The werewolves are: ");
            for (let i = 0; i < werewolves.length; i++) {
              this.players[i].send(werewolves[i] + " is a werewolf.");
            }
          }
          this.players[i].send("Tommorrow, help the werewolves survive. You can die without consequences.");
          break;
        //tell the werewolves who the other werewolf is.
        case Roles.werewolf:
          temporaryArray = this.players.slice();
          temporaryArray.splice(i, 1);
          werewolves = this.getPlayersWithInitialRoleInArray(temporaryArray, Roles.werewolf);
          this.players[i].send("You look to see if there are other wolves.");
          if (werewolves.length == 2) {
            this.players[i].send("There are three werewolves.");
            this.players[i].send(
              "Your werewolf partners are " + werewolves[0].username + " and " + werewolves[1].username + "."
            )
            this.players[i].send(
              "Try not to be suspicious! You must all pretend to be something else."
            );
          } else if (werewolves.length == 1) {
            this.players[i].send("There are two werewolves.");
            this.players[i].send(
              "Your werewolf partner is '" + werewolves[0].username + "'."
            );
            this.players[i].send(
              "Try not to be suspicious! You and your partner must pretend to be something else."
            );
          } else {
            this.players[i].send("You are the only werewolf.");
            this.players[i].send(
              "Try not to be suspicious! Pretend to be something else."
            );
          }
          break;
        //swap the robber's card with someone elses and tell them their new card
        case Roles.robber:
          let randomPlayer = this.getRandomPlayerExcludingPlayer(i);
          this.players[i].send("You swap your card with someone else's.");
          this.players[i].send(
            "You swapped your card with '" +
            randomPlayer.username +
            "' who was a " +
            randomPlayer.data.role +
            "."
          );
          if (randomPlayer.data.role == Roles.werewolf || randomPlayer.data.role == Roles.minion) {
            this.players[i].send(
              "You are now a " + randomPlayer.data.role + ".", undefined, Colors.red
            );
          } else if (randomPlayer.data.role == Roles.jester) {
            this.players[i].send(
              "You are now a " + randomPlayer.data.role + ".", undefined, Colors.yellow
            )
          } else {
            this.players[i].send(
              "You are now a " + randomPlayer.data.role + ".", undefined, Colors.green
            );
          }
          this.players[i].send(
            "'" + randomPlayer.username + "' is now a robber."
          );
          if (randomPlayer.data.role == Roles.werewolf) {
            this.players[i].send(
              "Try not to be suspicious! Pretend you're not a werewolf."
            );
          }
          this.players[i].data.role = randomPlayer.data.role;
          randomPlayer.data.role = Roles.robber;
          break;
        //tell the seer 2 of the center cards at random
        case Roles.seer:
          this.players[i].send(
            "There are 3 cards in the center of the table, one left, one middle and one right."
          );
          this.players[i].send("You look at two cards in the center.");
          let cardArray = ["left", "middle", "right"];
          var combo = Utils.chooseCombination(cardArray, 2);
          if (combo.indexOf("left") != -1) {
            this.players[i].send(
              "You look at the left card. The left card is a " + this.leftCard + "."
            );
          }
          if (combo.indexOf("middle") != -1) {
            this.players[i].send(
              "You look at the middle card. The middle card is a " + this.middleCard + "."
            );
          }
          if (combo.indexOf("right") != -1) {
            this.players[i].send(
              "You look at the right card. The right card is a " + this.rightCard + "."
            );
          }
          break;
        case Roles.villager:
          this.players[i].send(
            "You are a villager, so you do nothing. Goodnight!"
          );
          break;
        case Roles.jester:
          this.players[i].send("You are the jester, so you do nothing.");
          this.players[i].send(
            "You want to be killed in the trial. Act as suspiciously as possible!"
          );
          break;
      }
    }
    //transporter
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].data.actionRole == Roles.transporter) {
        let combo = Utils.chooseCombination(this.players, 2);
        let firstTarget = combo[0];
        let secondTarget = combo[1];
        if (firstTarget.equals(this.players[i])) {
          this.players[i].send("You swapped your own card with " +
            secondTarget.username +
            "'s card."
          );
        } else if (secondTarget.equals(this.players[i])) {
          this.players[i].send("You swapped your own card with " +
            firstTarget.username +
            "'s card."
          )
        } else {
          this.players[i].send(
            "You swapped '" +
            firstTarget.username +
            "''s card with '" +
            secondTarget.username +
            "''s card."
          );
        }
        let temporaryRole = firstTarget.data.role;
        firstTarget.data.role = secondTarget.data.role;
        secondTarget.data.role = temporaryRole;
      }
    }
    //troublemaker
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].data.actionRole == Roles.troublemaker) {
        temporaryArray = this.players.slice();
        //remove the troublemaker from the array
        temporaryArray.splice(i, 1);
        let combo = Utils.chooseCombination(temporaryArray, 2);
        let firstTarget = combo[0];
        let secondTarget = combo[1];
        this.players[i].send(
          "You swapped '" +
          firstTarget.username +
          "''s card with '" +
          secondTarget.username +
          "''s card."
        );
        let temporaryRole = firstTarget.data.role;
        firstTarget.data.role = secondTarget.data.role;
        secondTarget.data.role = temporaryRole;
      }
    }
    //drunk
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].data.actionRole == Roles.drunk) {
        randomvar = Math.floor(Math.random() * 3);
        this.players[i].send("There are 3 cards in the center of the table: one left, one middle and one right.");
        switch (randomvar) {
          case 0:
            this.players[i].send("You took the leftmost card from the center and swapped it with your own.");
            this.players[i].data.role = this.leftCard;
            break;
          case 1:
            this.players[i].send("You took the middle card from the center and swapped it with your own.");
            this.players[i].data.role = this.middleCard;
            break;
          case 2:
            this.players[i].send("You took the rightmost card from the center and swapped it with your own.");
            this.players[i].data.role = this.rightCard;
            break;
        }
      }
    }
    //insomniac
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].data.actionRole == Roles.insomniac) {
        this.players[i].send("It is the end of the night. You look at your card.");
        if (this.players[i].data.role == Roles.insomniac) {
          this.players[i].send("Your card has not changed. You are still an insomniac.", undefined, Colors.green);
        } else {
          if (this.players[i].data.role == Roles.werewolf || this.players[i].data.role == Roles.minion) {
            this.players[i].send("Your card has been swapped by somebody. You are now a " + this.players[i].data.role + ".", undefined, Colors.red);
          } else if (this.players[i].data.role == Roles.jester) {
            this.players[i].send("Your card has been swapped by somebody. You are now a " + this.players[i].data.role + ".", undefined, Colors.yellow);
            this.players[i].send("Tomorrow, you want to be killed in the trial. Act as suspiciously as possible!");
          } else {
            this.players[i].send("Your card has been swapped by somebody. You are now a " + this.players[i].data.role + ".", undefined, Colors.green);
          }
        }
        if (this.players[i].data.role == Roles.werewolf) {
          this.players[i].send(
            "Try not to be suspicious! Pretend that you are not a werewolf."
          );
        }
      }
    }
  }
  public customAdminReceive(player: Player, msg: string): void {
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
          default:
            player.send("Error: number of players is missing or incorrect." +
              " Example usage: !show 5 will show the rolelist for 5 players", Colors.brightRed);
            break;
        }
        //set the rolelist before the game begins
      } else if (Utils.isCommand(msg, "!set")) {
        let newlist: Array<string> = [];
        switch (Utils.commandArguments(msg)[0]) {
          case "3":
            this.threePlayer.list = this.parseRoleString(msg.slice(7, 7 + 6));
            break;
          case "4":
            this.fourPlayer.list = this.parseRoleString(msg.slice(7, 7 + 7));
            break;
          case "5":
            this.fivePlayer.list = this.parseRoleString(msg.slice(7, 7 + 8));
            break;
          case "6":
            this.sixPlayer.list = this.parseRoleString(msg.slice(7, 7 + 9));
            break;
          case "7":
            this.sevenPlayer.list = this.parseRoleString(msg.slice(7, 7 + 10));
            break;
          default:
            player.send("Error: number of players is missing or incorrect." +
              " Example usage: !set 5 ... will set the rolelist for 5 players", Colors.brightRed);
        }
        //reset rolelist to default if there has been a messup
      } else if (Utils.isCommand(msg, "!default")) {
        switch (Utils.commandArguments(msg)[0]) {
          case "3":
            this.threePlayer.list = defaultThreePlayer.list;
            break;
          case "4":
            this.fourPlayer.list = defaultFourPlayer.list;
            break;
          case "5":
            this.fivePlayer.list = defaultFivePlayer.list;
            break;
          case "6":
            this.sixPlayer.list = defaultSixPlayer.list;
            break;
          default:
            player.send("Error: number of players is missing or incorrect." +
              " Example usage: !default 5 will show the rolelist for 5 players", Colors.brightRed);
            break;
        }
      } else if (Utils.isCommand(msg, "!gamehelp")) {
        player.send("!roundtime !sround !stop, !start, !resume, !restart, !time, !hold," +
          " !release, !show, !set, !default, !yell, !help", undefined, Colors.green);
      }
    }
  }
  //convert a string into an array of roles, e.g
  // 'dwa' becomes [doppleganger, werewolf, amnesiac]
  private parseRoleString(roleString: string): Array<string> {
    let out: Array<string> = [];
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
  /**
   * Processes a message typed into the client by a player.
   * 
   * @param {string} id The id of the sender of the message.
   * @param {string} msg The message the sender sent to the game.
   * @memberof OneDay
   */
  public receive(player: Player, msg: string): void {
    //receive in-game commands from players if game is running
    if (msg[0] == "/" && this.inPlay) {
      if (Utils.isCommand(msg, "/vote")) {
        let username = msg.slice(5).trim();
        let exists = false;
        for (let i = 0; i < this.players.length; i++) {
          if (this.players[i].username == username) {
            player.send("Your vote for '" + username + "' has been received");
            player.data.vote = username;
            exists = true;
          }
        }
        if (!exists) {
          player.send("There's no player called '" + username + "'. Vote not changed.");
        }
      } else if (Utils.isCommand(msg, "/unvote") && player.data.vote != "") {
        player.send("Your vote for '" + player.data.vote + "' has been cancelled");
        player.data.vote = "";
      } else if (Utils.isCommand(msg, "/unvote") && player.data.vote == "") {
        player.send("You haven't voted for anybody yet, so there is nothing to cancel");
      } else if (Utils.isCommand(msg, "/rules")) {
        player.send("*** RULES ***", Colors.brightGreen);
        player.send("Everyone has a role on their card. There are also 3 cards in the middle that no one has.");
        player.send("During the night each player performs their role.");
        player.send("Not all these roles will be in the game: check the role list at the start.");
        player.send("First, the werewolves see who each other are.");
        player.send("Then the seer looks at two cards in the middle.");
        player.send("Then the robber swaps their card with someone else's and looks at it.");
        player.send("Then the transporter swaps two people's cards (possibly including themselves).");
        player.send("Then the troublemaker swaps two people's cards, excluding themselves.");
        player.send("Then the drunk swaps their card with one from the middle without seeing it.");
        player.send("Finally, the insomniac looks at their card to see if it changed.");
        player.send("The villager does nothing.");
        player.send("The jester wants to die.");
        player.send("If you card is swapped you become the role on your new card.");
        player.send("You may not know that you have been swapped.");
        player.send("During the day, everyone votes for someone to die.");
        player.send("If a werewolf dies, the town(everyone except the werewolves and the jester) wins.");
        player.send("The werewolves win if they survive and the jester doesn't die.");
        player.send("The jester wins if they die.");
        player.send("*** END RULES ***", Colors.brightGreen);
      } else {
        player.send("Error: no such command exists! Commands are /vote /unvote /rules");
      }
    } else {
      this.playerchat.receive(player, player.username + ": " + msg, undefined, undefined, player.color);
      this.endChat.receive(player, player.username + ": " + msg, undefined, undefined, player.color);
    }
  }
}
