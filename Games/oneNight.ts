/* 
    OpenWerewolf, an online one-night mafia game.
    Copyright (C) 2017 James Vaughan Craster  

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
    I, James Craster, require the preservation of this specified author attribution 
    in the Appropriate Legal Notices displayed by works containing material that has 
    been added to OpenWerewolf by me: 
    "This project includes code from OpenWerewolf. OpenWerewolf author: James V. Craster." 
*/

"use strict";
import { MessageRoom } from "../core";
import { Game } from "../core";
import { Player } from "../core";
import { Utils } from "../core";

enum Roles {
  werewolf = "werewolf",
  seer = "seer",
  robber = "robber",
  transporter = "transporter",
  villager = "villager"
}

class RoleList {
  private _list: Array<string> = [];
  constructor(list: Array<string>) {
    this._list = list;
  }
  get list() {
    return this._list;
  }
}

let threePlayer: RoleList = new RoleList([
  Roles.werewolf,
  Roles.werewolf,
  Roles.seer,
  Roles.robber,
  Roles.transporter,
  Roles.villager
]);
let fourPlayer: RoleList = new RoleList([
  Roles.werewolf,
  Roles.werewolf,
  Roles.seer,
  Roles.robber,
  Roles.transporter,
  Roles.villager,
  Roles.villager
]);
let fivePlayer: RoleList = new RoleList([
  Roles.werewolf,
  Roles.werewolf,
  Roles.seer,
  Roles.robber,
  Roles.transporter,
  Roles.villager,
  Roles.villager,
  Roles.villager
]);

export class OneNight extends Game {
  //define new message room
  private playerchat: MessageRoom = new MessageRoom();
  private leftCard: string = "";
  private middleCard: string = "";
  private rightCard: string = "";
  private time: number = 0;
  private minutes: number = 1;
  private length = 6;
  private trial: boolean = false;
  private won: boolean = false;
  private wonEarlyTime = 0;
  public constructor() {
    super();
    setInterval(this.update.bind(this), 500);
  }
  public getPlayersWithRole(role: string) {
    let players = [];
    for (let i = 0; i < this._players.length; i++) {
      if (this._players[i].data.role == role) {
        players.push(this._players[i]);
      }
    }
    return players;
  }
  public getPlayersWithInitialRoleInArray(players: Array<Player>, role: string) {
    let out = [];
    for (let i = 0; i < players.length; i++) {
      if (players[i].data.initialRole == role) {
        out.push(players[i]);
      }
    }
    return out;
  }
  public addPlayer(player: Player) {
    player.data.voteCount = 0;
    this.playerchat.addPlayer(player);
    super.addPlayer(player);
  }
  public getRandomPlayer() {
    let randomvar = Math.floor(Math.random() * this._players.length);
    if (randomvar >= this._players.length) {
      randomvar = this._players.length - 1;
    }
    return this._players[randomvar];
  }
  public getRandomPlayerFromArray(players: Array<Player>) {
    let randomvar = Math.floor(Math.random() * players.length);
    if (randomvar >= players.length) {
      randomvar = players.length - 1;
    }
    return players[randomvar];
  }
  public winResolution() {
    //tally up all the votes
    for (let i = 0; i < this._players.length; i++) {
      if (this._players[i].data.vote != "") {
        for (let j = 0; j < this._players.length; j++) {
          if (this._players[j].username == this._players[i].data.vote) {
            this._players[j].data.voteCount++;
            this.playerchat.broadcast("game", this._players[i].username + " voted for " + this._players[j].username + ".", true);
          }
        }
      }
    }
    //pick the player with the most votes and call them the loser
    let maxVoteCount = 0;
    let loser = this._players[0];
    for (let i = 0; i < this._players.length; i++) {
      if (this._players[i].data.voteCount > maxVoteCount) {
        maxVoteCount = this._players[i].data.voteCount;
        loser = this._players[i];
      }
    }

    this.playerchat.broadcast("game", loser.username + " has been hung.", true);
    this.playerchat.broadcast("game", loser.username + " was a " + loser.data.role + ".", true);
    if (loser.data.role == Roles.werewolf) {
      this.playerchat.broadcast("game", "The werewolves have lost.", true);
    } else {
      this.playerchat.broadcast("game", "The town have lost.", true);
    }
    //print out all the list of who had what role and whether their role changed at all
    for (let i = 0; i < this._players.length; i++) {
      this.playerchat.broadcast("game", this._players[i].username + " started as a " + this._players[i].data.initialRole +
        " and became a " + this._players[i].data.role + ".", true);
    }

  }
  update() {
    //if have max number of players, start the game immediately
    if (
      this._registeredPlayerCount >= this._maxPlayerCount &&
      this._inPlay == false
    ) {
      this.start();
    }
    //if players all voted early
    if (this.everyoneVoted() && this.won == false) {
      this.playerchat.broadcast("game", "Everyone has voted, so the game has ended.", true);
      this.winResolution();
      this.won = true;
      //set timer so that in 40 seconds the game ends
      this.wonEarlyTime = Date.now();
    }
    //if players voted early, kick everyone after 40 seconds 
    if (this.won == true && this.wonEarlyTime != 0 && Date.now() - this.wonEarlyTime > 40 * 1000) {
      this.playerchat.broadcast("game", "The game has ended.", true);
      //redirect players and reset
      this.end();
    }
    //if game is running
    if (this._inPlay && this.time != 0) {
      //notify players of time left every minute
      if (Date.now() - this.time > this.minutes * 1000 * 60 && this.minutes != this.length) {
        this.playerchat.broadcast("game", this.length - this.minutes + " minutes remain until the trial. You can vote at any time using \"/vote username\"", true);
        this.minutes += 1;
      }
      //end game
      if (Date.now() - this.time > this.length * 60 * 1000 + 70 * 1000) {
        this.playerchat.broadcast("game", "The game has ended.", true);
        //redirect and reset
        this.end();
        //do win resolution 40 seconds before game ends
      } else if (Date.now() - this.time > this.length * 60 * 1000 + 30 * 1000 && !this.won) {
        this.winResolution();
        this.won = true;
        //notify players of last 30 seconds
      } else if (Date.now() - this.time > this.length * 60 * 1000 && !this.trial) {
        this.trial = true;
        this.playerchat.broadcast("game", "The trial has begun, you have 30 seconds! Vote now using \"/vote username\"", true);
      }
    }

  }
  end() {
    //emit event that causes players to reload
    for (let i = 0; i < this._players.length; i++) {
      this._players[i].emit("reload");
    }
    //reset inital conditions
    super.end();
    this.playerchat = new MessageRoom();
    this.leftCard = "";
    this.middleCard = "";
    this.rightCard = "";
    this.time = 0;
    this.minutes = 1;
    this.length = 6;
    this.trial = false;
    this.won = false;
    this.wonEarlyTime = 0;
  }
  //returns true if everyone voted
  everyoneVoted() {
    let out = true;
    for (let i = 0; i < this._players.length; i++) {
      //if someone hasn't voted, return false
      if (this._players[i].data.vote == "" || this._players[i].data.vote == undefined) {
        return false;
      }
    }
    //if no players, return false
    if (this._players.length == 0) {
      return false;
    }
    return out;
  }
  start() {
    super.start();
    //set everyone's vote to blank
    for (let i = 0; i < this._players.length; i++) {
      this._players[i].data.vote = "";
    }
    this.broadcast("***NEW GAME***");
    //print out all players
    let playersString = "";
    for (let i = 0; i < this._players.length; i++) {
      if (i != 0) {
        playersString += ", "
      }
      playersString += this._players[i].username;
    }
    this.playerchat.broadcast("game", "Players: " + playersString + ".", true);
    //shuffle the deck and hand out roles to players
    let roleList: Array<string> = [];
    let randomDeck: Array<string> = [];
    switch (this._players.length) {
      case 3:
        roleList = threePlayer.list;
        break;
      case 4:
        roleList = fourPlayer.list;
        break;
      case 5:
        roleList = fivePlayer.list;
        break;
    }
    randomDeck = Utils.shuffle(roleList);
    //list all of the roles in the order in which they wake up
    let rolesString = "";
    for (let i = 0; i < roleList.length; i++) {
      if (i != 0) {
        rolesString += ", "
      }
      rolesString += roleList[i];
    }
    this.playerchat.broadcast("game", "Roles (in order of when they act): " + rolesString + ".", true);
    //mute everyone in the player chat
    this.playerchat.muteAll();
    this.playerchat.broadcast(
      "game",
      "If your card is swapped with another, you become the role on your new card. You do not wake up again.",
      true
    );
    this.playerchat.broadcast(
      "game",
      "Your card may be swapped by the robber or transporter without you realising it.",
      true
    );

    //for debugging purposes, choose the deck:
    //randomDeck = [Roles.seer, Roles.werewolf, Roles.transporter, Roles.werewolf, Roles.villager, Roles.transporter];
    for (let i = 0; i < this._players.length; i++) {
      this._players[i].send(
        "You look at your card. You are a " + randomDeck[i] + "."
        //add town team/ww team explanation
      );
      //each player starts with two roles, the initialRole and the role. initialRole is constant
      //and dictates when the player wakes up during the night.
      //role can change if the player is robbed/transported etc 
      this._players[i].data.role = randomDeck[i];
      this._players[i].data.initialRole = randomDeck[i];
    }
    //assign three cards in the middle
    this.leftCard = randomDeck[randomDeck.length - 1];
    this.middleCard = randomDeck[randomDeck.length - 2];
    this.rightCard = randomDeck[randomDeck.length - 3];
    //perform night actions
    //tell the seer 2 of the cards at random
    //swap the robber's card with someone elses and tell them their new card
    //swap two roles (transporter)
    //tell the werewolves who the other werewolf is.
    let randomvar = 0;
    let temporaryArray = [];
    for (let i = 0; i < this._players.length; i++) {
      switch (this._players[i].data.initialRole) {
        case Roles.werewolf:
          temporaryArray = this._players.slice();
          temporaryArray.splice(i, 1);
          let werewolves = this.getPlayersWithInitialRoleInArray(
            temporaryArray,
            Roles.werewolf
          );
          if (werewolves.length == 1) {
            this._players[i].send("There are two werewolves.");
            this._players[i].send(
              "Your werewolf partner is '" + werewolves[0].username + "'."
            );
            this._players[i].send(
              "Tommorrow, try not to be suspicious! You and your partner must pretend to be something else."
            );
          } else {
            this._players[i].send("You are the only werewolf.");
            this._players[i].send(
              "Tommorrow, try not to be suspicious! Pretend to be something else."
            );
          }
          break;
        case Roles.robber:
          temporaryArray = this._players.slice();
          temporaryArray.splice(i, 1);
          let randomPlayer = this.getRandomPlayerFromArray(temporaryArray);
          this._players[i].send(
            "You swapped your card with '" +
            randomPlayer.username +
            "' who was a " +
            randomPlayer.data.role +
            "."
          );
          this._players[i].send(
            "You are now a " + randomPlayer.data.role + "."
          );
          this._players[i].send(
            "'" + randomPlayer.username + "' is now a robber."
          );
          if (randomPlayer.data.role == Roles.werewolf) {
            this._players[i].send(
              "Tomorrow, try not to be suspicious! Pretend that you are not a werewolf."
            );
          }
          this._players[i].data.role = randomPlayer.data.role;
          randomPlayer.data.role = Roles.robber;
          break;
        case Roles.seer:
          this._players[i].send(
            "There are 3 cards in the center of the table, one left, one middle and one right."
          );
          this._players[i].send("You look at two cards in the center.");
          let cardArray = [this.leftCard, this.middleCard, this.rightCard];
          randomvar = Math.floor(Math.random() * 3);
          if (randomvar >= 3) {
            randomvar = 2;
          }
          switch (randomvar) {
            case 0:
              this._players[i].send(
                "You look at the left card. The left card is a " + this.leftCard + "."
              );
              randomvar = Math.floor(Math.random() * 2);
              if (randomvar >= 2) {
                randomvar = 1;
              }
              switch (randomvar) {
                case 0:
                  this._players[i].send(
                    "You look at the middle card. The middle card is a " +
                    this.middleCard + "."
                  );
                  break;
                case 1:
                  this._players[i].send(
                    "You look at the right card. The right card is a " +
                    this.rightCard + "."
                  );
                  break;
              }
              break;
            case 1:
              this._players[i].send(
                "You look at the middle card. The middle card is a " +
                this.middleCard + "."
              );
              randomvar = Math.floor(Math.random() * 2);
              if (randomvar >= 2) {
                randomvar = 1;
              }
              switch (randomvar) {
                case 0:
                  this._players[i].send(
                    "You look at the left card. The left card is a " +
                    this.leftCard + "."
                  );
                  break;
                case 1:
                  this._players[i].send(
                    "You look at the right card. The right card is a " +
                    this.rightCard + "."
                  );
                  break;
              }
              break;
            case 2:
              this._players[i].send(
                "You look at the right card. The right card is a " +
                this.rightCard + "."
              );
              randomvar = Math.floor(Math.random() * 2);
              if (randomvar >= 2) {
                randomvar = 1;
              }
              switch (randomvar) {
                case 0:
                  this._players[i].send(
                    "You look at the left card. The left card is a " +
                    this.leftCard + "."
                  );
                  break;
                case 1:
                  this._players[i].send(
                    "You look at the middle card. The middle card is a " +
                    this.middleCard + "."
                  );
                  break;
              }
              break;
          }
          break;
        case Roles.villager:
          this._players[i].send(
            "You are a villager, so you do nothing. Goodnight!"
          );
      }
    }
    for (let i = 0; i < this._players.length; i++) {
      switch (this._players[i].data.initialRole) {
        case Roles.transporter:
          randomvar = Math.floor(Math.random() * this._players.length);
          if (randomvar >= this._players.length) {
            randomvar = this._players.length - 1;
          }
          let firstTarget = randomvar;
          temporaryArray = this._players.slice();
          temporaryArray.splice(firstTarget, 1);
          randomvar = Math.floor(Math.random() * temporaryArray.length);
          if (randomvar >= temporaryArray.length) {
            randomvar = temporaryArray.length - 1;
          }
          let secondTarget = this.getPlayer(temporaryArray[randomvar].id);
          if (secondTarget instanceof Player) {
            if (firstTarget == i) {
              this._players[i].send(
                "You swapped your own card with " +
                secondTarget.username +
                "'s card."
              );
            } else if (secondTarget == this._players[i]) {
              this._players[i].send(
                "You swapped your own card with " +
                this._players[firstTarget].username +
                "'s card."
              );
            } else {
              this._players[i].send(
                "You swapped '" +
                this._players[firstTarget].username +
                "''s card with '" +
                secondTarget.username +
                "''s card."
              );
            }
            let temporaryRole = this._players[firstTarget].data.role;
            this._players[firstTarget].data.role = secondTarget.data.role;
            secondTarget.data.role = temporaryRole;
          }
          break;
      }
    }
    //unmute and everyone in the player chat
    this.playerchat.unmuteAll();
    this.playerchat.broadcast(
      "game",
      "6 minutes remain until trial. You can secretly vote to kill someone at any time by typing \"/vote username\"," +
      " for example, \"/vote frank\" secretly casts a hidden vote for frank. You can undo your vote at any time" +
      " by typing \"/unvote\". If everyone has voted, the game will end early.",
      true
    );
    this.playerchat.broadcast(
      "game",
      "If a werewolf is killed in the trial, the town team win. If no werewolves are killed in the trial, the werewolves win.",
      true
    );
    this.playerchat.broadcast(
      "game",
      "You can secretly read the rules at any time by typing \"/rules\".",
      true
    );
    //start timer
    this.time = Date.now();
  }
  receive(id: string, msg: string) {
    let player = this.getPlayer(id);
    if (player instanceof Player) {
      //receive commands from players
      if (msg[0] == "/") {
        if (msg.slice(0, 5) == "/vote") {
          let username = msg.slice(5).trim();
          let exists = false;
          for (let i = 0; i < this._players.length; i++) {
            if (this._players[i].username == username) {
              player.send("Your vote for '" + username + "' has been received");
              player.data.vote = username;
              exists = true;
            }
          }
          if (!exists) {
            player.send("There's no player called '" + username + "'. Vote not changed.");
          }
        } else if (msg.slice(0, 7) == "/unvote" && player.data.vote != "") {
          player.send("Your vote for '" + player.data.vote + "' has been cancelled");
          player.data.vote = "";
        } else if (msg.slice(0, 7) == "/unvote" && player.data.vote == "") {
          player.send("You haven't voted for anybody yet, so there is nothing to cancel");
        } else {
          player.send("Error: no such command exists! Commands are /vote /unvote /rules");
        }
        //implement a /rules command
      } else {
        this.playerchat.broadcast(player.id, player.username + ": " + msg);
      }
    }
  }
}
