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
const player_1 = require("../../Core/player");
const Local_1 = require("../Local/Local");
const Roles_1 = require("../Local/Roles");
/**
 * A class that contains a user and adds to it all the player information
 * that the game needs, like roles, votes, etc.
 */
class LocalPlayer extends player_1.Player {
    constructor(user, role) {
        super(user);
        this._diedThisNight = false;
        this._alive = true;
        //the target of this player's night action (a username)
        this._target = "";
        this._healed = false;
        this._roleBlocked = false;
        this._hanged = false;
        //the number of votes the mafia has given to this player (to be attacked)
        this._mafiaVotes = 0;
        //the username of the player that this player is nominating during the trial
        this._vote = "";
        this._finalVote = Local_1.FinalVote.abstain;
        this._role = role;
    }
    get alive() {
        return this._alive;
    }
    get role() {
        return this._role;
    }
    get hanged() {
        return this._hanged;
    }
    hang() {
        this._hanged = true;
    }
    get alignment() {
        return this._role.alignment;
    }
    get roleName() {
        return this._role.roleName;
    }
    isRole(role) {
        return this._role.roleName == role.roleName;
    }
    set target(target) {
        this._target = target;
    }
    get target() {
        return this._target;
    }
    clearTarget() {
        this._target = "";
    }
    get winCondition() {
        return this._role.winCondition;
    }
    resetAfterNight() {
        this.clearTarget();
        this._healed = false;
        this._mafiaVotes = 0;
        this._roleBlocked = false;
    }
    resetAfterTrial() {
        this._vote = "";
        this._finalVote = Local_1.FinalVote.abstain;
    }
    set healed(healed) {
        this._healed = healed;
    }
    get healed() {
        return this._healed;
    }
    roleBlock() {
        this._roleBlocked = true;
    }
    get roleBlocked() {
        return this._roleBlocked;
    }
    set roleBlocked(roleblocked) {
        this._roleBlocked = roleblocked;
    }
    kill() {
        if ((this._alive = true)) {
            this._alive = false;
            this._diedThisNight = true;
        }
    }
    get mafiaVotes() {
        return this._mafiaVotes;
    }
    incrementMafiaVote() {
        if (this.alignment != Roles_1.Alignment.mafia) {
            this._mafiaVotes++;
        }
    }
    set diedThisNight(diedThisNight) {
        this._diedThisNight = diedThisNight;
    }
    get diedThisNight() {
        return this._diedThisNight;
    }
    voteFor(target) {
        this._vote = target.id;
    }
    get vote() {
        return this._vote;
    }
    clearVote() {
        this._vote = "";
    }
    set finalVote(vote) {
        this._finalVote = vote;
    }
    get finalVote() {
        return this._finalVote;
    }
    get abilities() {
        return this._role.abilities;
    }
}
exports.LocalPlayer = LocalPlayer;
//# sourceMappingURL=LocalPlayer.js.map