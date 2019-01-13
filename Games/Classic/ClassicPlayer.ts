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
import { Player } from "../../Core/player";
import { User } from "../../Core/user";
import { FinalVote } from "../../Games/Classic/Classic";
import { Role, Alignment, Ability } from "../../Games/Classic/Roles";

/**
 * A class that contains a user and adds to it all the player information
 * that the game needs, like roles, votes, etc.
 */
export class ClassicPlayer extends Player {
  private _diedThisNight: boolean = false;
  private _alive: boolean = true;
  //the target of this player's night action (a username)
  private _target: string = "";
  private _healed: boolean = false;
  private _roleBlocked: boolean = false;
  private _hanged: boolean = false;
  //the number of votes the mafia has given to this player (to be attacked)
  private _mafiaVotes: number = 0;
  //the username of the player that this player is nominating during the trial
  private _vote: string = "";
  private _finalVote: string = FinalVote.abstain;
  private readonly _role: Role;
  constructor(user: User, role: Role) {
    super(user);
    this._role = role;
  }
  public get alive() {
    return this._alive;
  }
  public get role() {
    return this._role;
  }
  public get hanged() {
    return this._hanged;
  }
  public hang() {
    this._hanged = true;
  }
  public get alignment(): Alignment {
    return this._role.alignment;
  }
  public get roleName(): string {
    return this._role.roleName;
  }
  public isRole(role: Role): boolean {
    return this._role.roleName == role.roleName;
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
  public get winCondition() {
    return this._role.winCondition;
  }
  public resetAfterNight() {
    this.clearTarget();
    this._healed = false;
    this._mafiaVotes = 0;
    this._roleBlocked = false;
  }
  public resetAfterTrial() {
    this._vote = "";
    this._finalVote = FinalVote.abstain;
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
  set roleBlocked(roleblocked) {
    this._roleBlocked = roleblocked;
  }
  public kill(): void {
    if ((this._alive = true)) {
      this._alive = false;
      this._diedThisNight = true;
    }
  }
  public get mafiaVotes() {
    return this._mafiaVotes;
  }
  public incrementMafiaVote() {
    if (this.alignment != Alignment.mafia) {
      this._mafiaVotes++;
    }
  }
  public set diedThisNight(diedThisNight: boolean) {
    this._diedThisNight = diedThisNight;
  }
  public get diedThisNight() {
    return this._diedThisNight;
  }
  public voteFor(target: User) {
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
  public get abilities(): Array<{
    ability: Ability;
    uses?: number | undefined;
  }> {
    return this._role.abilities;
  }
}
