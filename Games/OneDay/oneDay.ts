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

import { MessageRoom, Server, Game, Player, Utils, RoleList, Colors, Stopwatch } from "../../core";

enum Roles {
  /** 
   * The evil role, there may be two in the game. They wake up and see each other
   */
  werewolf = "werewolf",
  /** 
   *  Sees two cards from the centre
   */
  seer = "seer",
  /**
   *  Swaps someone one else's card with their own and looks at it
   */
  robber = "robber",
  /**
   *  Swaps two people's cards, potentially including themselves
   */
  transporter = "transporter",
  /**
   *  Does nothing
   */
  villager = "villager",
  /**
   *  Takes one card from the middle without looking at it
   */
  drunk = "drunk",
  /**
   *  Looks at their card at the end of the night phase to see if it has changed
   */
  insomniac = "insomniac",
  /**
   *  Wants to be lynched in the trial. If the jester wins, everyone else loses
   */
  jester = "jester"
}

const threePlayer: RoleList = new RoleList([
  Roles.werewolf,
  Roles.werewolf,
  Roles.seer,
  Roles.robber,
  Roles.transporter,
  Roles.drunk
]);
const fourPlayer: RoleList = new RoleList([
  Roles.werewolf,
  Roles.werewolf,
  Roles.seer,
  Roles.robber,
  Roles.transporter,
  Roles.drunk,
  Roles.insomniac
]);
const fivePlayer: RoleList = new RoleList([
  Roles.werewolf,
  Roles.werewolf,
  Roles.seer,
  Roles.robber,
  Roles.transporter,
  Roles.drunk,
  Roles.insomniac,
  Roles.villager
]);
const sixPlayer: RoleList = new RoleList([
  Roles.werewolf,
  Roles.werewolf,
  Roles.seer,
  Roles.robber,
  Roles.transporter,
  Roles.drunk,
  Roles.insomniac,
  Roles.villager,
  Roles.jester
]);

export class OneDay extends Game {
  //define new message room
  private playerchat: MessageRoom = new MessageRoom();
  private leftCard: string = "";
  private middleCard: string = "";
  private rightCard: string = "";
  private time: number = 0;
  private minutes: number = 1;
  private readonly length = 6;
  private trial: boolean = false;
  private won: boolean = false;
  private wonEarlyTime = 0;
  private startClock: Stopwatch = new Stopwatch();
  private startWait = 30000;
  private holdVote: boolean = false;

  public constructor(server: Server) {
    super(server, 3, 6);
    setInterval(this.update.bind(this), 500);
  }

  private getPlayersWithRole(role: string) {
    let players = [];
    for (let i = 0; i < this._players.length; i++) {
      if (this._players[i].data.role == role) {
        players.push(this._players[i]);
      }
    }
    return players;
  }

  private getPlayersWithInitialRoleInArray(players: Array<Player>, role: string) {
    let out = [];
    for (let i = 0; i < players.length; i++) {
      if (players[i].data.initialRole == role) {
        out.push(players[i]);
      }
    }
    return out;
  }

  public addPlayer(player: Player) {
    super.addPlayer(player);

    player.data.voteCount = 0;
    player.data.startVote = false;
    this.playerchat.addPlayer(player);
    //If the number of players is between minimum and maximum count, inform them of the wait remaining before game starts
    if (this._players.length > this._minPlayerCount && this._players.length < this._maxPlayerCount) {
      player.send("The game will start in " + (Math.floor((this.startWait - this.startClock.time) / 1000)).toString() + " seconds");
      player.send("Type \"/start\" to start the game immediately");
    }
  }

  private getRandomPlayer() {
    let randomvar = Math.floor(Math.random() * this._players.length);
    if (randomvar >= this._players.length) {
      randomvar = this._players.length - 1;
    }
    return this._players[randomvar];
  }

  private getRandomPlayerFromArray(players: Array<Player>) {
    let randomvar = Math.floor(Math.random() * players.length);
    if (randomvar >= players.length) {
      randomvar = players.length - 1;
    }
    return players[randomvar];
  }

  private winResolution() {
    //tally up all the votes
    for (let i = 0; i < this._players.length; i++) {
      if (this._players[i].data.vote != "") {
        for (let j = 0; j < this._players.length; j++) {
          if (this._players[j].username == this._players[i].data.vote) {
            this._players[j].data.voteCount++;
            this.playerchat.broadcast(this._players[i].username + " voted for " + this._players[j].username + ".");
          }
        }
      }
    }
    //pick the player with the most votes and call them the loser
    let maxVoteCount = 0;
    //if no players are around, stop here
    if (this._players.length == 0) {
      return;
    }
    let loser = this._players[0];
    for (let i = 0; i < this._players.length; i++) {
      if (this._players[i].data.voteCount > maxVoteCount) {
        maxVoteCount = this._players[i].data.voteCount;
        loser = this._players[i];
      }
    }

    this.playerchat.broadcast(loser.username + " has been hung.");
    this.playerchat.broadcast(loser.username + " was a " + loser.data.role + ".");
    if (loser.data.role == Roles.werewolf) {
      this.playerchat.broadcast("The town has won! Everyone else loses.", undefined, Colors.green);
      for (let i = 0; i < this._players.length; i++) {
        if (this._players[i].data.role != Roles.jester && this._players[i].data.role != Roles.werewolf) {
          this._players[i].send("*** YOU WIN! ***", Colors.brightGreen);
        } else {
          this._players[i].send("*** YOU LOSE! ***", Colors.brightRed);
        }
      }
    } else if (loser.data.role == Roles.jester) {
      this.playerchat.broadcast("The jester has won! Everyone else loses.", undefined, Colors.yellow);
      for (let i = 0; i < this._players.length; i++) {
        if (this._players[i].data.role == Roles.jester) {
          this._players[i].send("*** YOU WIN! ***", Colors.brightGreen);
        } else {
          this._players[i].send("*** YOU LOSE! ***", Colors.brightRed);
        }
      }
    } else {
      this.playerchat.broadcast("The werewolves have won! Everyone else loses.", undefined, Colors.red);
      for (let i = 0; i < this._players.length; i++) {
        if (this._players[i].data.role == Roles.werewolf) {
          this._players[i].send("*** YOU WIN! ***", Colors.brightGreen);
        } else {
          this._players[i].send("*** YOU LOSE! ***", Colors.brightRed);
        }
      }
    }
    //print out all the list of who had what role and whether their role changed at all
    for (let i = 0; i < this._players.length; i++) {
      this.playerchat.broadcast(this._players[i].username + " started as a " + this._players[i].data.initialRole +
        " and became a " + this._players[i].data.role + ".");
    }

  }

  protected update() {
    if (!this.inPlay) {
      //if have max number of players, start the game immediately
      if (this._registeredPlayerCount >= this._maxPlayerCount) {
        this.start();
        //if have minimum number of players
      } else if (this._registeredPlayerCount >= this._minPlayerCount) {
        //if startClock has been ticking for startWait time, start:
        if (this.startClock.time > this.startWait) {
          this.start();

          //if a majority has typed /start, start:
        } else if (!this.holdVote) {
          let voteCount = 0;
          for (let i = 0; i < this._players.length; i++) {
            if (this._players[i].data.startVote) {
              voteCount++;
            }
          }
          if (voteCount >= this._players.length / 2) {
            this.start();
          }
        }
        //if everyone has typed /wait, wait a further 30 seconds up to a limit of 3 minutes:

      } else {
        this.startClock.restart();
        this.startClock.start();
      }
    }
    //if game is running
    if (this._inPlay && this.time != 0) {
      //if players have all left, end the game
      if (this._players.length == 0) {
        this.end();
      }
      //if players all voted early
      if (this.everyoneVoted() && this.won == false) {
        this.playerchat.broadcast("Everyone has voted, so the game has ended.");
        this.winResolution();
        this.won = true;
        //set timer so that in 40 seconds the game ends
        this.wonEarlyTime = Date.now();
      }
      //if players voted early, kick everyone after 40 seconds 
      if (this.won == true && this.wonEarlyTime != 0 && Date.now() - this.wonEarlyTime > 40 * 1000) {
        this.playerchat.broadcast("The game has ended.");
        //redirect players and reset
        this.end();
        console.log("Game ended.");
      }
      //notify players of time left every minute
      if (Date.now() - this.time > this.minutes * 1000 * 60 && this.minutes != this.length && !this.won) {
        this.playerchat.broadcast(this.length - this.minutes + " minutes remain until the trial. You can vote at any time using \"/vote username\"");
        this.minutes += 1;
      }
      //end game
      if (Date.now() - this.time > this.length * 60 * 1000 + 70 * 1000) {
        this.playerchat.broadcast("The game has ended.");
        //redirect and reset
        this.end();
        console.log("Game ended.");
        //do win resolution 40 seconds before game ends
      } else if (Date.now() - this.time > this.length * 60 * 1000 + 30 * 1000 && !this.won) {
        this.winResolution();
        this.won = true;
        //notify players of last 30 seconds
      } else if (Date.now() - this.time > this.length * 60 * 1000 && !this.trial && !this.won) {
        this.trial = true;
        this.playerchat.broadcast("The trial has begun, you have 30 seconds! Vote now using \"/vote username\"");
      }
    }

  }

  protected end() {
    //emit event that causes players to reload
    for (let i = 0; i < this._players.length; i++) {
      this._players[i].emit("reload");
    }
    //make sure all players are kicked from the server
    let temporaryPlayerList = this._players.slice();
    for (let i = 0; i < temporaryPlayerList.length; i++) {
      this._server.kick(temporaryPlayerList[i].id);
    }
    console.log("here is the length of the game list " + this._players.length);
    console.log("here is the game player array " + this._players);
    //reset inital conditions
    this._players = [];
    this.playerchat = new MessageRoom();
    this.leftCard = "";
    this.middleCard = "";
    this.rightCard = "";
    this.time = 0;
    this.minutes = 1;
    this.trial = false;
    this.won = false;
    this.wonEarlyTime = 0;
    super.end();
  }
  //returns true if everyone voted
  private everyoneVoted() {
    let out = true;
    for (let i = 0; i < this._players.length; i++) {
      //if someone hasn't voted and isn't disconnected, return false
      if ((this._players[i].data.vote == "" || this._players[i].data.vote == undefined) && !this._players[i].disconnected) {
        return false;
      }
    }
    //if no players, return false
    if (this._players.length == 0) {
      return false;
    }
    return out;
  }
  protected start() {
    super.start();
    //set everyone's vote to blank
    for (let i = 0; i < this._players.length; i++) {
      this._players[i].data.vote = "";
    }
    this.broadcast("*** NEW GAME ***", Colors.brightGreen);
    //print out all players
    this.broadcastPlayerList();
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
      case 6:
        roleList = sixPlayer.list;
        break;
    }
    randomDeck = Utils.shuffle(roleList);
    //list all of the roles in the order in which they wake up
    this.broadcastRoleList(roleList);
    //mute everyone in the player chat
    this.playerchat.muteAll();
    this.playerchat.broadcast(
      "If your card is swapped with another, you become the role on your new card. You do not wake up again.",
    );
    this.playerchat.broadcast(
      "Your card may be swapped by the robber or transporter without you realising it.",
    );

    //for debugging purposes, ou can choose the deck:
    //randomDeck = [Roles.seer, Roles.werewolf, Roles.transporter, Roles.werewolf, Roles.villager, Roles.transporter];
    for (let i = 0; i < this._players.length; i++) {
      if (randomDeck[i] == Roles.werewolf) {
        this._players[i].send(
          "You look at your card. You are a " + randomDeck[i] + ".", undefined, Colors.red
          //add town team/ww team explanation
        );
      } else if (randomDeck[i] == Roles.jester) {
        this._players[i].send(
          "You look at your card. You are a " + randomDeck[i] + ".", undefined, Colors.yellow
        );
      } else {
        this._players[i].send(
          "You look at your card. You are a " + randomDeck[i] + ".", undefined, Colors.green
        );
      }
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
    this.nightActions();
    //unmute and everyone in the player chat
    this.playerchat.unmuteAll();
    this.playerchat.broadcast(
      "6 minutes remain until trial. You can secretly vote to kill someone at any time by typing \"/vote username\"," +
      " for example, \"/vote frank\" secretly casts a hidden vote for frank. You can undo your vote at any time" +
      " by typing \"/unvote\". If everyone has voted, the game will end early.",
    );
    this.playerchat.broadcast(
      "If a werewolf is killed in the trial, the town team win. If no werewolves are killed in the trial, the werewolves win. But if the " +
      "jester (if there is one, check the rolelist) is killed in the trial, the jester wins, and everyone else loses."
    );
    this.playerchat.broadcast(
      "You can secretly read the rules at any time by typing \"/rules\".",

    );
    //start timer
    this.time = Date.now();
  }

  private nightActions(): void {
    let randomvar = 0;
    let temporaryArray = [];
    for (let i = 0; i < this._players.length; i++) {
      switch (this._players[i].data.initialRole) {
        //tell the werewolves who the other werewolf is.
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
        //swap the robber's card with someone elses and tell them their new card
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
          if (randomPlayer.data.role == Roles.werewolf) {
            this._players[i].send(
              "You are now a " + randomPlayer.data.role + ".", undefined, Colors.red
            );
          } else if (randomPlayer.data.role == Roles.jester) {
            this._players[i].send(
              "You are now a " + randomPlayer.data.role + ".", undefined, Colors.yellow
            )
          } else {
            this._players[i].send(
              "You are now a " + randomPlayer.data.role + ".", undefined, Colors.green
            );
          }
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
        //tell the seer 2 of the center cards at random
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
          break;
        case Roles.jester:
          this._players[i].send("You are the jester, so you do nothing.");
          this._players[i].send(
            "Tomorrow, you want to be killed in the trial. Act as suspiciously as possible!"
          );
          break;
      }
    }
    //transporter
    for (let i = 0; i < this._players.length; i++) {
      if (this._players[i].data.initialRole == Roles.transporter) {
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
    //drunk
    for (let i = 0; i < this._players.length; i++) {
      if (this._players[i].data.initialRole == Roles.drunk) {
        randomvar = Math.floor(Math.random() * 3);
        if (randomvar >= 3) {
          randomvar = 2;
        }
        this._players[i].send("There are 3 cards in the center of the table: one left, one middle and one right.");
        switch (randomvar) {
          case 0:
            this._players[i].send("You took the leftmost card from the center and swapped it with your own.");
            this._players[i].data.role = this.leftCard;
            break;
          case 1:
            this._players[i].send("You took the middle card from the center and swapped it with your own.");
            this._players[i].data.role = this.middleCard;
            break;
          case 2:
            this._players[i].send("You took the rightmost card from the center and swapped it with your own.");
            this._players[i].data.role = this.rightCard;
        }

      }
    }
    //insomniac
    for (let i = 0; i < this._players.length; i++) {
      if (this._players[i].data.initialRole == Roles.insomniac) {
        this._players[i].send("It is the end of the night. You look at your card.");
        if (this._players[i].data.role == Roles.insomniac) {
          this._players[i].send("Your card has not changed. You are still an insomniac.", undefined, Colors.green);
        } else {
          if (this._players[i].data.role == Roles.werewolf) {
            this._players[i].send("Your card has been swapped by somebody. You are now a " + this._players[i].data.role + ".", undefined, Colors.red);
          } else {
            this._players[i].send("Your card has been swapped by somebody. You are now a " + this._players[i].data.role + ".", undefined, Colors.green);
          }
        }
        if (this._players[i].data.role == Roles.werewolf) {
          this._players[i].send(
            "Tomorrow, try not to be suspicious! Pretend that you are not a werewolf."
          );
        }
      }
    }
  }

  /**
   * Processes a message typed into the client by a player.
   * 
   * @param {string} id The id of the sender of the message.
   * @param {string} msg The message the sender sent to the game.
   * @memberof OneDay
   */
  public receive(id: string, msg: string) {
    let player = this.getPlayer(id);
    if (player instanceof Player) {
      //receive in-game commands from players if game is running
      if (msg[0] == "/" && this.inPlay) {
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
        //TODO: implement a /rules command
      } else if (msg[0] == "/" && !this.inPlay && player.data.startVote == false) {
        if (msg.slice(0, 6) == "/start") {
          player.data.startVote = true;
          this.playerchat.broadcast(player.username + " has voted to start the game immediately by typing \"/start\"");
        }
      } else {
        this.playerchat.receive(player.id, player.username + ": " + msg);
      }
    }
  }
  //admin commands
  public adminReceive(id: string, msg: string) {
    let player = this.getPlayer(id);
    if (player instanceof Player) {
      if (msg[0] == "!" && !this.inPlay && player.admin == true) {
        console.log("true");
        console.log(msg.slice(0, 4));
        if (msg.slice(0, 5) == "!stop") {
          this.startClock.stop();
          player.send("Countdown stopped", undefined, Colors.green);
        } else if (msg.slice(0, 6) == "!start") {
          if (this._registeredPlayerCount >= this._minPlayerCount) {
            this.start();
          } else {
            player.send("Not enough players to start game", Colors.brightRed);
          }
        } else if (msg.slice(0, 7) == "!resume") {
          this.startClock.start();
          player.send("Countdown resumed", undefined, Colors.green);
        } else if (msg.slice(0, 8) == "!restart") {
          this.startClock.restart();
          player.send("Countdown restarted", undefined, Colors.green);
        } else if (msg.slice(0, 5) == "!time") {
          player.send(this.startClock.time.toString());
        } else if (msg.slice(0, 5) == "!hold") {
          player.send("The vote to start has been halted.", undefined, Colors.green);
          this.holdVote = true;
        } else if (msg.slice(0, 8) == "!release") {
          player.send("The vote to start has been resumed", undefined, Colors.green);
          this.holdVote = false;
        } else if (msg.slice(0, 5) == "!help") {
          player.send("!stop, !start, !resume, !restart, !time, !hold, !release, !help", undefined, Colors.green);
        }
      }
    }
  }
}
