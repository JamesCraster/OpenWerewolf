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
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("../../Core/core");
const Roles_1 = require("../Local/Roles");
const LocalPlayer_1 = require("./LocalPlayer");
const app_1 = require("../../app");
var Phase;
(function (Phase) {
    Phase["day"] = "day";
    Phase["night"] = "night";
})(Phase || (Phase = {}));
var Trial;
(function (Trial) {
    Trial["ended"] = "ended";
    Trial["nominate"] = "nominate";
    Trial["verdict"] = "verdict";
})(Trial || (Trial = {}));
var FinalVote;
(function (FinalVote) {
    FinalVote["guilty"] = "guilty";
    FinalVote["abstain"] = "abstain";
    FinalVote["innocent"] = "innocent";
})(FinalVote = exports.FinalVote || (exports.FinalVote = {}));
//import { defaultLists } from "./List.json";
let fs = require("fs");
const Default = JSON.parse(fs.readFileSync("Games/Local/List.json", "utf-8"));
let globalMinimumPlayerCount = 4;
//four player games are for debugging only
if (app_1.DEBUGMODE) {
    globalMinimumPlayerCount = 4;
}
class Local extends core_1.Game {
    constructor(server, name, uid) {
        super(server, globalMinimumPlayerCount, 15, "Local", name, uid, "OpenWerewolf-Local", "James Craster", "Apache-2.0");
        this.phase = Phase.day;
        //what stage the trial is in
        this.trial = Trial.ended;
        this.dayClock = new core_1.Stopwatch();
        this.daychat = new core_1.MessageRoom();
        this.mafiachat = new core_1.MessageRoom();
        this.trialClock = new core_1.Stopwatch();
        this.maxTrialsPerDay = 3;
        this.trialsThisDay = 0;
        //days after which there is a stalemate if no deaths
        this.maxDaysWithoutDeath = 3;
        this.daysWithoutDeath = 0;
        this.deadChat = new core_1.MessageRoom();
        this.players = [];
        super.addMessageRoom(this.daychat);
        super.addMessageRoom(this.mafiachat);
        super.addMessageRoom(this.deadChat);
    }
    playersCanVote() {
        this.players
            .filter(player => player.alive)
            .map(player => player.user.canVote());
    }
    playersCannotVote() {
        for (let player of this.players) {
            player.user.cannotVote();
        }
    }
    dayUnmute() {
        this.players
            .filter(player => player.alive)
            .map(player => this.daychat.unmute(player.user));
    }
    //called if the game has gone on too many days without a kill
    stalemate() {
        this.daychat.broadcast("Three days have passed without a death.", undefined, core_1.Colors.yellow);
        this.daychat.broadcast("The game has ended in a stalemate.", undefined, core_1.Colors.yellow);
        for (let player of this.players) {
            player.user.headerSend([
                {
                    text: "The game has ended in a stalemate.",
                    color: core_1.Colors.brightYellow,
                },
            ]);
            player.user.headerSend([
                {
                    text: "*** YOU LOSE! ***",
                    color: core_1.Colors.brightRed,
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
    winCondition() {
        let townWin = Roles_1.GameEndConditions.townWin(this);
        let mafiaWin = Roles_1.GameEndConditions.mafiaWin(this);
        if (townWin) {
            this.daychat.broadcast("The town have won!", undefined, core_1.Colors.green);
            this.headerBroadcast([
                { text: "The town have won!", color: core_1.Colors.brightGreen },
            ]);
        }
        else if (mafiaWin) {
            this.daychat.broadcast("The mafia have won!", undefined, core_1.Colors.red);
            this.headerBroadcast([
                { text: "The mafia have won!", color: core_1.Colors.brightRed },
            ]);
        }
        if (townWin || mafiaWin) {
            //announce other factions that have won (that aren't town or mafia)
            for (let player of this.players) {
                if (player.winCondition(player, this) &&
                    player.alignment != Roles_1.Alignment.mafia &&
                    player.alignment != Roles_1.Alignment.town) {
                    if (player.role.color != undefined) {
                        this.headerBroadcast([
                            {
                                text: "The " + player.roleName + " has won!",
                                color: player.role.color,
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
                            color: core_1.Colors.brightGreen,
                        },
                    ]);
                }
                else {
                    player.user.headerSend([
                        {
                            text: "*** YOU LOSE! ***",
                            color: core_1.Colors.brightRed,
                        },
                    ]);
                }
            }
            //list all winners in the chat
            let winners = "";
            let count = 0;
            for (let player of this.players) {
                if (player.winCondition(player, this)) {
                    if (count == 0) {
                        winners += player.user.username;
                    }
                    else {
                        winners += `, ${player.user.username}`;
                    }
                    count++;
                }
            }
            this.broadcast(`Winners: ${winners}`, core_1.Colors.brightGreen);
            this.end();
        }
        return townWin || mafiaWin;
    }
    start() {
        this.beforeStart();
        this.broadcastPlayerList();
        //we map the rolename strings from List.json into role classes
        let roleList = Default.defaultLists[this.users.length - globalMinimumPlayerCount].map(stringElem => {
            return Object.keys(Roles_1.Roles)
                .map(elem => Roles_1.Roles[elem])
                .find(elem => elem.roleName == stringElem);
        });
        //this.broadcastRoleList(roleList.map(elem => elem.roleName));
        let randomDeck = core_1.Utils.shuffle(roleList);
        this.daychat.muteAll();
        //hand out roles
        for (let i = 0; i < randomDeck.length; i++) {
            //console.log(randomDeck[i]);
            switch (randomDeck[i]) {
                case Roles_1.Roles.mafioso:
                    this.players.push(new LocalPlayer_1.LocalPlayer(this.users[i], Roles_1.Roles.mafioso));
                    this.mafiachat.addUser(this.players[i].user);
                    this.mafiachat.mute(this.players[i].user);
                    break;
                default:
                    this.players.push(new LocalPlayer_1.LocalPlayer(this.users[i], randomDeck[i]));
                    break;
            }
        }
        for (let player of this.players) {
            //tell the player what their role is
            this.sendRole(player, player.alignment, player.role.roleName);
            if (player.role.alignment == Roles_1.Alignment.town) {
                player.user.emit("role", player.role.roleName, core_1.Colors.brightGreen);
            }
            else if (player.role.alignment == Roles_1.Alignment.mafia) {
                player.user.emit("role", player.role.roleName, core_1.Colors.brightRed);
            }
            else {
                player.user.emit("role", player.role.roleName, player.role.color);
            }
        }
        //print the list of roles in the left panel
        /*for (let player of this.players) {
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
        }*/
        this.setAllTime(5000, 0);
        setTimeout(this.night.bind(this), 5000);
    }
    sendRole(player, alignment, role) {
        switch (alignment) {
            case Roles_1.Alignment.town:
                player.user.send(`You are a ${role}`, undefined, core_1.Colors.green);
                player.user.headerSend([
                    { text: "You are a ", color: core_1.Colors.white },
                    { text: role, color: core_1.Colors.brightGreen },
                ]);
                break;
            case Roles_1.Alignment.mafia:
                player.user.send(`You are a ${role}`, undefined, core_1.Colors.red);
                player.user.headerSend([
                    { text: "You are a ", color: core_1.Colors.white },
                    { text: role, color: core_1.Colors.brightRed },
                ]);
                break;
            case Roles_1.Alignment.neutral:
                player.user.send(`You are a ${role}`, undefined, player.role.color);
                player.user.headerSend([
                    { text: "You are a ", color: core_1.Colors.white },
                    { text: role, color: player.role.color },
                ]);
                break;
        }
    }
    night() {
        this.cancelVoteSelection();
        this.playersCanVote();
        //reset the gallows' animation if they have been used
        for (let player of this.players) {
            player.user.resetGallows();
        }
        this.broadcast("Night has fallen.", undefined, core_1.Colors.nightBlue);
        this.headerBroadcast([
            { text: "Night has fallen", color: core_1.Colors.nightBlue },
        ]);
        this.phase = Phase.night;
        //Let the mafia communicate with one another
        this.mafiachat.unmuteAll();
        this.mafiachat.broadcast("This is the mafia chat, you can talk to other mafia now in secret.");
        //tell the mafia who the other mafia are
        let mafiaList = this.players
            .filter(player => player.isRole(Roles_1.Roles.mafioso))
            .map(player => player.user.username);
        let mafiaString = "The mafia are : " + core_1.Utils.arrayToCommaSeparated(mafiaList);
        this.mafiachat.broadcast(mafiaString);
        this.daychat.broadcast("Click on someone to perform your action on them.");
        this.setAllTime(30000, 10000);
        setTimeout(this.nightResolution.bind(this), 30000);
    }
    hang(target) {
        target.hang();
        this.kill(target);
        target.diedThisNight = false;
    }
    kill(target) {
        //let the other players know the target has died
        this.markAsDead(target.user.username);
        target.kill();
        if (this.deadChat.getMemberById(target.user.id) == undefined) {
            this.deadChat.addUser(target.user);
        }
        this.daysWithoutDeath = 0;
    }
    nightResolution() {
        //sort players based off of the const priorities list
        let nightPlayerArray = this.players.sort((element) => {
            return Roles_1.priorities.indexOf(element.role);
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
                            if (nightPlayerArray[i].abilities[j].ability.condition(targetPlayer, this, nightPlayerArray[i])) {
                                nightPlayerArray[i].abilities[j].ability.action(targetPlayer, this, nightPlayerArray[i]);
                                let uses = nightPlayerArray[i].abilities[j].uses;
                                if (uses) {
                                    nightPlayerArray[i].abilities[j].uses = uses - 1;
                                }
                            }
                        }
                        else {
                            nightPlayerArray[i].user.send("You were roleblocked!", core_1.Colors.brightRed);
                        }
                    }
                    else {
                        nightPlayerArray[i].user.send("You couldn't perform your ability; out of uses!", core_1.Colors.brightRed);
                    }
                }
            }
        }
        //calculate the plurality target of the mafia
        let maxVotes = 0;
        let finalTargetPlayer = undefined;
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].isRole(Roles_1.Roles.mafioso)) {
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
                    case Roles_1.Roles.mafioso.roleName:
                        //tell the mafia who the target is
                        this.players[i].user.send("Your target is: ");
                        if (finalTargetPlayer) {
                            this.players[i].user.send(finalTargetPlayer.user.username);
                            this.players[i].user.send("You attack your target.");
                            if (finalTargetPlayer.healed) {
                                this.players[i].user.send(finalTargetPlayer.user.username +
                                    " was healed during the night and so" +
                                    " they have survived.");
                            }
                            else {
                                this.players[i].user.send(finalTargetPlayer.user.username + " has died.");
                                this.kill(finalTargetPlayer);
                            }
                        }
                        else {
                            this.players[i].user.send("No one, as neither of you voted for a target.");
                        }
                        //tell the mafia if target is healed
                        break;
                }
            }
        }
        let deaths = 0;
        //Notify the dead that they have died
        for (let player of this.players) {
            if (player.diedThisNight) {
                player.user.send("You have been killed!", undefined, core_1.Colors.red);
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
        this.daychat.broadcast("Dawn has broken.", undefined, core_1.Colors.yellow);
        this.headerBroadcast([
            { text: "Dawn has broken", color: core_1.Colors.brightYellow },
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
        }
        else {
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
    day() {
        if (!this.winCondition()) {
            if (this.daysWithoutDeath == 1) {
                this.daychat.broadcast("No one died yesterday. If no one dies in the next two days the game will end in a stalemate.");
            }
            if (this.daysWithoutDeath == 2) {
                this.daychat.broadcast("No one has died for two days. If no one dies by tomorrow morning the game will end in a stalemate.");
            }
            //If no one has died in three days, end the game in a stalemate.
            if (this.daysWithoutDeath >= this.maxDaysWithoutDeath) {
                this.stalemate();
            }
            this.daysWithoutDeath++;
            this.trialsThisDay = 0;
            this.trialClock.restart();
            this.trialClock.stop();
            this.daychat.broadcast("1 minute of general discussion until the trials begin. Discuss who to nominate!");
            //make time to wait shorter if in debug mode
            if (app_1.DEBUGMODE) {
                this.setAllTime(20000, 20000);
                setTimeout(this.trialVote.bind(this), 20000);
            }
            else {
                this.setAllTime(60000, 20000);
                setTimeout(this.trialVote.bind(this), 60000);
            }
        }
    }
    trialVote() {
        if (this.trialsThisDay >= this.maxTrialsPerDay) {
            this.daychat.broadcast("The town is out of trials - you only get 3 trials a day! Night begins.");
            this.endDay();
            return;
        }
        this.dayUnmute();
        this.cancelVoteSelection();
        this.trialClock.start();
        this.daychat.broadcast("The trial has begun! The player with a majority of votes will be put on trial.");
        this.daychat.broadcast("Max 60 seconds. If the target is acquited you can vote for a new one.");
        this.daychat.broadcast("Click on somebody to nominate them.");
        this.playersCanVote();
        this.setAllTime(Math.max(0, 60000 - this.trialClock.time), 20000);
        this.trial = Trial.nominate;
        this.dayClock.restart();
        this.dayClock.start();
        this.tallyInterval = setInterval(this.tallyVotes.bind(this), 1000);
    }
    tallyVotes() {
        let count = 0;
        let defendant = 0;
        let aliveCount = this.players.filter(player => player.alive).length;
        let beginTrial = false;
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
    defenseSpeech(defendant) {
        this.cancelVoteSelection();
        this.playersCannotVote();
        this.trial = Trial.ended;
        this.daychat.broadcast(this.players[defendant].user.username + " is on trial.");
        this.daychat.broadcast("The accused can defend themselves for 20 seconds.");
        this.daychat.muteAll();
        this.daychat.unmute(this.players[defendant].user);
        if (app_1.DEBUGMODE) {
            this.setAllTime(5000, 5000);
            setTimeout(this.finalVote.bind(this), 5 * 1000, defendant);
        }
        else {
            this.setAllTime(20000, 5000);
            setTimeout(this.finalVote.bind(this), 20 * 1000, defendant);
        }
    }
    finalVote(defendant) {
        this.trial = Trial.verdict;
        this.dayUnmute();
        this.daychat.broadcast("20 seconds to vote: click on guilty or innocent, or do nothing to abstain.");
        this.headerBroadcast([
            { text: "Vote to decide ", color: core_1.Colors.white },
            {
                text: this.players[defendant].user.username,
                color: this.players[defendant].user.color,
            },
            { text: "'s fate", color: core_1.Colors.white },
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
    verdict(defendant) {
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
                    { text: "guilty", color: core_1.Colors.brightRed },
                ]);
                guiltyCount++;
            }
            else if (this.players[i].finalVote == FinalVote.innocent) {
                this.daychat.broadcast([
                    { text: this.players[i].user.username + " voted " },
                    { text: "innocent", color: core_1.Colors.brightGreen },
                ]);
                innocentCount++;
            }
            else if (this.players[i].alive && i != defendant) {
                this.daychat.broadcast([
                    { text: this.players[i].user.username + " chose to " },
                    { text: "abstain", color: core_1.Colors.brightYellow },
                ]);
            }
        }
        if (guiltyCount > innocentCount) {
            this.hang(this.players[defendant]);
            this.daychat.broadcast(this.players[defendant].user.username + " has died.");
            //play the hanging animation for every player
            for (let player of this.players) {
                player.user.hang([this.players[defendant].user.username]);
            }
            this.setAllTime(10000, 0);
            setTimeout(this.endDay.bind(this), 10 * 1000);
        }
        else {
            this.daychat.broadcast(this.players[defendant].user.username + " has been acquitted");
            if (this.trialClock.time < 60000) {
                //reset trial values and call trial vote
                this.trial = Trial.ended;
                for (let player of this.players) {
                    player.resetAfterTrial();
                }
                this.trialVote();
            }
            else {
                this.daychat.broadcast("Time's up! Night will now begin.");
                this.setAllTime(10000, 0);
                setTimeout(this.endDay.bind(this), 10 * 1000);
            }
        }
    }
    endDay() {
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
    disconnect(user) {
        let player = this.getPlayer(user.id);
        if (player instanceof LocalPlayer_1.LocalPlayer) {
            this.kill(player);
            this.broadcast(player.user.username + " has died.");
        }
    }
    end() {
        //reset initial conditions
        this.phase = Phase.day;
        this.trial = Trial.ended;
        this.dayClock = new core_1.Stopwatch();
        this.afterEnd();
    }
    receive(user, msg) {
        let player = this.getPlayer(user.id);
        this.endChat.receive(user, [
            { text: user.username, color: user.color },
            { text: ": " + msg },
        ]);
        if (this.inPlay && player instanceof LocalPlayer_1.LocalPlayer) {
            if (player.alive) {
                if (msg[0] == "/") {
                    if (core_1.Utils.isCommand(msg, "/vote") && this.phase == Phase.night) {
                        let username = msg.slice(5).trim();
                        let exists = false;
                        for (let i = 0; i < this.players.length; i++) {
                            if (this.players[i].user.username == username) {
                                exists = true;
                                if (this.players[i].alive) {
                                    player.user.send("Your choice of '" + username + "' has been received.");
                                    player.target = this.players[i].user.id;
                                }
                                else {
                                    player.user.send("That player is dead, you cannot vote for them.");
                                }
                            }
                        }
                        if (!exists) {
                            player.user.send("There's no player called '" + username + "'. Try again.");
                        }
                    }
                    else if (core_1.Utils.isCommand(msg, "/vote") &&
                        this.trial == Trial.nominate) {
                        let username = core_1.Utils.commandArguments(msg)[0];
                        for (let i = 0; i < this.players.length; i++) {
                            if (this.players[i].user.username == username) {
                                if (this.players[i].alive) {
                                    player.voteFor(this.players[i].user);
                                    this.daychat.broadcast(player.user.username + " voted for '" + username + "'.");
                                }
                                else {
                                    player.user.send("That player is dead, you cannot vote for them.");
                                }
                            }
                        }
                    }
                    else if (core_1.Utils.isCommand(msg, "/unvote") &&
                        this.trial == Trial.nominate) {
                        if (player.vote != "") {
                            let voteTarget = this.getPlayer(player.vote);
                            if (voteTarget) {
                                player.user.send("Your vote for " +
                                    voteTarget.user.username +
                                    " has been cancelled.");
                                this.daychat.broadcast(player.user.username +
                                    " cancelled their vote for " +
                                    voteTarget.user.username);
                                player.clearVote();
                            }
                        }
                        else {
                            player.user.send("You cannot cancel your vote as you haven't vote for anyone.");
                        }
                    }
                    else if (core_1.Utils.isCommand(msg, "/guilty") &&
                        this.trial == Trial.verdict) {
                        player.finalVote = FinalVote.guilty;
                        player.user.send("You have voted guilty.");
                    }
                    else if ((core_1.Utils.isCommand(msg, "/innocent") ||
                        core_1.Utils.isCommand(msg, "/inno")) &&
                        this.trial == Trial.verdict) {
                        player.finalVote = FinalVote.innocent;
                        player.user.send("You have voted innocent.");
                    }
                }
                else {
                    this.daychat.receive(player.user, [
                        { text: player.user.username, color: player.user.color },
                        { text: ": " + msg },
                    ]);
                    if (player.isRole(Roles_1.Roles.mafioso)) {
                        this.mafiachat.receive(user, [
                            { text: player.user.username, color: player.user.color },
                            { text: ": " + msg },
                        ]);
                    }
                }
            }
            else {
                this.deadChat.receive(player.user, [
                    {
                        text: player.user.username,
                        color: player.user.color,
                        italic: true,
                    },
                    { text: ": " + msg, color: core_1.Colors.grey, italic: true },
                ]);
            }
        }
        else {
            this.daychat.receive(user, [
                { text: user.username, color: user.color },
                { text: ": " + msg },
            ]);
        }
    }
    addUser(user) {
        //player.emit('getAllRolesForSelection', [{name:'Mafia', color:'red'},{name:'Cop', color:'green'}];
        this.daychat.addUser(user);
        super.addUser(user);
    }
    getPlayer(id) {
        return this.players.find(player => player.user.id == id);
    }
    resendData(user) {
        let player = this.getPlayer(user.id);
        if (player) {
            if (player.role.alignment == Roles_1.Alignment.town) {
                player.user.emit("role", player.role.roleName, core_1.Colors.brightGreen);
            }
            else if (player.role.alignment == Roles_1.Alignment.mafia) {
                player.user.emit("role", player.role.roleName, core_1.Colors.brightRed);
            }
            else {
                player.user.emit("role", player.role.roleName, player.role.color);
            }
        }
    }
}
exports.Local = Local;
//# sourceMappingURL=Local.js.map