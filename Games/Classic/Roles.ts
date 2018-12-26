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

/*import { Classic } from "./Classic";
import { Player, RoleList } from "../../Core/core";
class PlayerData {
  private readonly role: Role;
  constructor(role: Role) {
    this.role = role;
  }
}
enum Alignment {
  town = "town",
  mafia = "mafia",
  neutral = "neutral",
}
enum Passives {
  //cannot be killed at night
  nightImmune = "nightImmune",
  roleblockImmune = "roleblockImmune",
}
type WinCondition = (game: Classic) => boolean;
type Ability = {
  condition?: (targetPlayer: Player, game: Classic) => boolean;
  action: (targetPlayer: Player, game: Classic) => void;
};
type Role = {
  alignment: Alignment;
  winCondition: (game: Classic) => boolean;
  abilities: Array<{ ability: Ability; uses?: number }>;
  passives: Array<Passives>;
};
namespace WinConditions {
  export const town: WinCondition = (game: Classic) => {
    for (let player of game.playerList) {
      if (player.data.alignment == Alignment.mafia) {
        return false;
      }
    }
    return true;
  };
  export const mafia: WinCondition = (game: Classic) => {
    for (let player of game.playerList) {
      if (player.data.alignment == Alignment.town) {
        return false;
      }
    }
    return true;
  };
}
namespace Abilities {
  export const kill: Ability = {
    action: (targetPlayer: Player, game: Classic) => {
      game.kill(targetPlayer);
    },
  };
}
namespace Roles {
  export const vigilante: Role = {
    alignment: Alignment.town,
    winCondition: WinConditions.town,
    abilities: [{ ability: Abilities.kill, uses: 2 }],
    passives: [],
  };
  export const mafioso: Role = {
    alignment: Alignment.mafia,
    winCondition: WinConditions.mafia,
    abilities: [{ ability: Abilities.kill }],
    passives: [],
  };
  export const godfather: Role = {
    alignment: Alignment.mafia,
    winCondition: WinConditions.mafia,
    abilities: [{ ability: Abilities.kill }],
    passives: [],
  };
}
*/
