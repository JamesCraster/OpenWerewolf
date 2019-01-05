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

import { Classic, ClassicPlayer } from "./Classic";
import { RoleList } from "../../Core/core";

export enum Alignment {
  town = "town",
  mafia = "mafia",
  neutral = "neutral",
}

enum Passives {
  //cannot be killed at night
  nightImmune = "nightImmune",
  roleblockImmune = "roleblockImmune",
}

type WinCondition = (player: ClassicPlayer, game: Classic) => boolean;

type Ability = {
  condition?: (targetPlayer: ClassicPlayer, game: Classic) => boolean;
  action: (targetPlayer: ClassicPlayer, game: Classic) => void;
};

export type Role = {
  roleName: string;
  alignment: Alignment;
  winCondition: WinCondition;
  abilities: Array<{ ability: Ability; uses?: number }>;
  passives: Array<Passives>;
};
namespace WinConditions {
  export const town: WinCondition = (player: ClassicPlayer, game: Classic) => {
    for (let player of game.players) {
      if (player.alignment == Alignment.mafia) {
        return false;
      }
    }
    return true;
  };
  export const mafia: WinCondition = (player: ClassicPlayer, game: Classic) => {
    for (let player of game.players) {
      if (player.alignment == Alignment.town) {
        return false;
      }
    }
    return true;
  };
}
namespace Abilities {
  export const kill: Ability = {
    action: (targetPlayer: ClassicPlayer, game: Classic) => {
      game.kill(targetPlayer);
    },
  };
}
export namespace Roles {
  export const vigilante: Role = {
    roleName: "vigilante",
    alignment: Alignment.town,
    winCondition: WinConditions.town,
    abilities: [{ ability: Abilities.kill, uses: 2 }],
    passives: [],
  };
  export const mafioso: Role = {
    roleName: "mafioso",
    alignment: Alignment.mafia,
    winCondition: WinConditions.mafia,
    abilities: [{ ability: Abilities.kill }],
    passives: [],
  };
  export const godfather: Role = {
    roleName: "godfather",
    alignment: Alignment.mafia,
    winCondition: WinConditions.mafia,
    abilities: [{ ability: Abilities.kill }],
    passives: [Passives.nightImmune],
  };
  export const doctor: Role = {
    roleName: "doctor",
    alignment: Alignment.town,
    winCondition: WinConditions.town,
    abilities: [],
    passives: [],
  };
  export const sherrif: Role = {
    roleName: "sherrif",
    alignment: Alignment.town,
    winCondition: WinConditions.town,
    abilities: [],
    passives: [],
  };
}
