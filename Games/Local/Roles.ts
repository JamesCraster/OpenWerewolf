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
import { Local } from "./Local";
import { LocalPlayer } from "./LocalPlayer";
import { Player } from "../../Core/player";
import { Colors } from "../../Core/utils";
import { string } from "prop-types";

export enum Alignment {
  town = "town",
  mafia = "mafia",
  neutral = "neutral",
  undefined = "undefined",
}

enum Passives {
  //cannot be killed at night
  nightImmune = "nightImmune",
  roleblockImmune = "roleblockImmune",
}

type WinCondition = (player: LocalPlayer, game: Local) => boolean;
type GameEndCondition = (game: Local) => boolean;

export type Ability = {
  condition: (
    targetPlayer: LocalPlayer,
    game: Local,
    player?: Player,
  ) => boolean | undefined;
  action: (
    targetPlayer: LocalPlayer,
    game: Local,
    player?: LocalPlayer,
  ) => void;
};

export type Role = {
  roleName: string;
  alignment: Alignment;
  winCondition: WinCondition;
  abilities: Array<{ ability: Ability; uses?: number }>;
  passives: Array<Passives>;
  color?: Colors;
};

export namespace GameEndConditions {
  //town wins if no mafia remain
  export const townWin: GameEndCondition = (game: Local) => {
    for (let player of game.players) {
      if (player.alignment == Alignment.mafia && player.alive) {
        return false;
      }
    }
    return true;
  };
  //mafia wins if there are no town left alive, or there is just 1 town and 1 mafia (which would otherwise cause stalemate)
  export const mafiaWin: GameEndCondition = (game: Local) => {
    let townCount = 0;
    let mafiaCount = 0;
    let alive = 0;
    for (let player of game.players) {
      if (player.alignment == Alignment.town && player.alive) {
        townCount += 1;
      }
      if (player.alignment == Alignment.mafia && player.alive) {
        mafiaCount += 1;
      }
      if (player.alive) {
        alive += 1;
      }
    }
    return townCount == 0 || (townCount == 1 && mafiaCount == 1 && alive == 2);
  };
}
export namespace WinConditions {
  export const town: WinCondition = (player: LocalPlayer, game: Local) => {
    return GameEndConditions.townWin(game);
  };
  export const mafia: WinCondition = (player: LocalPlayer, game: Local) => {
    return GameEndConditions.mafiaWin(game);
  };
  export const survive: WinCondition = (player: LocalPlayer, game: Local) => {
    return player.alive;
  };
  export const hanged: WinCondition = (player: LocalPlayer, game: Local) => {
    return player.hanged;
  };
  //make last one standing exclusive, except for survivors
  export const lastOneStanding: WinCondition = (
    player: LocalPlayer,
    game: Local,
  ) => {
    let aliveCount = 0;
    for (let player of game.players) {
      if (player.alive) {
        aliveCount += 1;
      }
    }
    return player.alive && aliveCount <= 2;
  };
  export const undefined: WinCondition = (player: LocalPlayer, game: Local) => {
    return false;
  };
}
namespace Conditions {
  export const alwaysTrue = (targetPlayer: LocalPlayer, game: Local) => {
    return true;
  };
}
namespace Abilities {
  export const kill: Ability = {
    condition: (targetPlayer: LocalPlayer, game: Local, player?: Player) => {
      if (targetPlayer.healed && player) {
        player.user.send("Your target was healed!");
      }
      return !targetPlayer.healed;
    },
    action: (targetPlayer: LocalPlayer, game: Local) => {
      game.kill(targetPlayer);
    },
  };
  export const heal: Ability = {
    condition: Conditions.alwaysTrue,
    action: (targetPlayer: LocalPlayer, game: Local) => {
      targetPlayer.healed = true;
    },
  };
  export const getAlignment: Ability = {
    condition: Conditions.alwaysTrue,
    action: (targetPlayer: LocalPlayer, game: Local, player?: LocalPlayer) => {
      if (player) {
        player.user.send("You investigated your target:");
        player.user.send(
          targetPlayer.user.username + " is a " + targetPlayer.alignment,
        );
      }
    },
  };
  export const roleBlock: Ability = {
    condition: Conditions.alwaysTrue,
    action: (targetPlayer: LocalPlayer, game: Local) => {
      targetPlayer.roleBlocked = true;
    },
  };
}

export let Roles: { [x: string]: Role } = {
  vigilante: {
    roleName: "vigilante",
    alignment: Alignment.town,
    winCondition: WinConditions.town,
    abilities: [{ ability: Abilities.kill, uses: 2 }],
    passives: [],
  },
  mafioso: {
    roleName: "mafioso",
    alignment: Alignment.mafia,
    winCondition: WinConditions.mafia,
    abilities: [{ ability: Abilities.kill }],
    passives: [],
  },
  godfather: {
    roleName: "godfather",
    alignment: Alignment.mafia,
    winCondition: WinConditions.mafia,
    abilities: [{ ability: Abilities.kill }],
    passives: [Passives.nightImmune],
  },
  doctor: {
    roleName: "doctor",
    alignment: Alignment.town,
    winCondition: WinConditions.town,
    abilities: [{ ability: Abilities.heal }],
    passives: [],
  },
  sherrif: {
    roleName: "sherrif",
    alignment: Alignment.town,
    winCondition: WinConditions.town,
    abilities: [{ ability: Abilities.getAlignment }],
    passives: [],
  },
  townie: {
    roleName: "townie",
    alignment: Alignment.town,
    winCondition: WinConditions.town,
    abilities: [],
    passives: [],
  },
  escort: {
    roleName: "escort",
    alignment: Alignment.town,
    winCondition: WinConditions.town,
    abilities: [{ ability: Abilities.roleBlock }],
    passives: [Passives.roleblockImmune],
  },
  survivor: {
    roleName: "survivor",
    alignment: Alignment.neutral,
    winCondition: WinConditions.survive,
    color: Colors.yellow,
    abilities: [],
    passives: [],
  },
  medium: {
    roleName: "medium",
    alignment: Alignment.town,
    winCondition: WinConditions.town,
    abilities: [],
    passives: [],
  },
  jester: {
    roleName: "jester",
    alignment: Alignment.neutral,
    winCondition: WinConditions.hanged,
    color: Colors.magenta,
    abilities: [],
    passives: [],
  },
  serialKiller: {
    roleName: "serial killer",
    alignment: Alignment.neutral,
    winCondition: WinConditions.lastOneStanding,
    color: Colors.magenta,
    abilities: [],
    passives: [],
  },
  anyTown: {
    roleName: "Any Town",
    alignment: Alignment.town,
    winCondition: WinConditions.undefined,
    abilities: [],
    passives: [],
  },
  any: {
    roleName: "Any",
    alignment: Alignment.undefined,
    winCondition: WinConditions.undefined,
    abilities: [],
    passives: [],
  },
};

export const priorities = [
  Roles.escort,
  Roles.doctor,
  Roles.godfather,
  Roles.mafioso,
  Roles.vigilante,
  Roles.sherrif,
  Roles.townie,
  Roles.survivor,
  Roles.jester,
];
