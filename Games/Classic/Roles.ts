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
import { Classic } from "./Classic";
import { ClassicPlayer } from "./ClassicPlayer";
import { Player } from "../../Core/player";
import { Colors } from "../../Core/utils";

export enum Alignment {
  town = "town",
  mafia = "mafia",
  neutral = "neutral",
  undefined = "undefined",
}

export enum Passives {
  //cannot be killed at night
  nightImmune = "nightImmune",
  roleblockImmune = "roleblockImmune",
  speakWithDead = "hearDeadChat",
}

type WinCondition = (player: ClassicPlayer, game: Classic) => boolean;
type GameEndCondition = (game: Classic) => boolean;

export type Ability = {
  condition: (
    targetPlayer: ClassicPlayer,
    game: Classic,
    player?: Player,
  ) => boolean | undefined;
  action: (
    targetPlayer: ClassicPlayer,
    game: Classic,
    player?: ClassicPlayer,
  ) => void;
};

export interface Role {
  roleName: string;
  alignment: Alignment;
  winCondition: WinCondition;
  abilities: Array<{ ability: Ability; uses?: number }>;
  passives: Array<Passives>;
  color?: Colors;
  backgroundColor?: Colors;
};

export namespace GameEndConditions {
  //town wins if no mafia remain
  export const townWin: GameEndCondition = (game: Classic) => {
    for (let player of game.players) {
      if (player.alignment == Alignment.mafia && player.alive) {
        return false;
      }
    }
    return true;
  };
  //mafia wins if there are no town left alive, or there is just 1 town and 1 mafia (which would otherwise cause stalemate)
  export const mafiaWin: GameEndCondition = (game: Classic) => {
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
  export const town: WinCondition = (player: ClassicPlayer, game: Classic) => {
    return GameEndConditions.townWin(game);
  };
  export const mafia: WinCondition = (player: ClassicPlayer, game: Classic) => {
    return GameEndConditions.mafiaWin(game);
  };
  export const lynchTarget: WinCondition = (player: ClassicPlayer, game: Classic) => {
    if (player.winLynchTarget) {
      return player.winLynchTarget.hanged;
    } else {
      console.log("Error: executioner was not given lynch target")
      return false;
    }
  }
  export const survive: WinCondition = (
    player: ClassicPlayer,
    game: Classic,
  ) => {
    return player.alive;
  };
  export const hanged: WinCondition = (
    player: ClassicPlayer,
    game: Classic,
  ) => {
    return player.hanged;
  };
  //make last one standing exclusive, except for survivors
  export const lastOneStanding: WinCondition = (
    player: ClassicPlayer,
    game: Classic,
  ) => {
    let aliveCount = 0;
    for (let player of game.players) {
      if (player.alive) {
        aliveCount += 1;
      }
    }
    return player.alive && aliveCount <= 2;
  };
  export const undefined: WinCondition = (
    player: ClassicPlayer,
    game: Classic,
  ) => {
    return false;
  };
}
namespace Conditions {
  export const alwaysTrue = (targetPlayer: ClassicPlayer, game: Classic) => {
    return true;
  };
}
namespace Abilities {
  export const kill: Ability = {
    condition: (
      targetPlayer: ClassicPlayer,
      game: Classic,
      player?: Player,
    ) => {
      if (targetPlayer.healed && player) {
        player.user.send("Your target was healed!");
      }
      return !targetPlayer.healed;
    },
    action: (targetPlayer: ClassicPlayer, game: Classic) => {
      game.kill(targetPlayer);
    },
  };
  export const mafiaKill: Ability = {
    condition: (
      targetPlayer: ClassicPlayer,
      game: Classic,
      player?: Player,
    ) => {
      if (player) {
        console.log(targetPlayer.user.username);
        console.log(targetPlayer.healed);
        game.mafiachat.broadcast(`${player.user.username} attacked ${targetPlayer.user.username}.`);
        if (targetPlayer.healed) {
          game.mafiachat.broadcast(`The target was healed and so survived the attack.`);
        }
        return !targetPlayer.healed;
      } else {
        console.log('Err: mafia killer not passed into mafiaKill')
        return false;
      }
    },
    action: Abilities.kill.action
  }
  export const godfatherOrder: Ability = {
    condition: (targetPlayer: ClassicPlayer, game: Classic, player?: Player) => {
      return !game.players.find(player => player.role == Roles.mafioso && !player.roleBlocked) && Abilities.mafiaKill.condition(targetPlayer, game, player as Player)
    },
    action: Abilities.kill.action
  }
  export const mafiosoKill: Ability = {
    condition: Conditions.alwaysTrue,
    action: (targetPlayer: ClassicPlayer, game: Classic, player?: ClassicPlayer) => {
      if (player) {
        let godfather = game.players.find(elem => elem.role == Roles.godfather);
        if (godfather) {
          let godfatherTarget = game.getPlayer(godfather.target);
          if (godfatherTarget) {
            if (Abilities.mafiaKill.condition(godfatherTarget, game, player)) {
              Abilities.kill.action(godfatherTarget, game, player);
            }
            return;
          }
        }
        if (Abilities.mafiaKill.condition(targetPlayer, game, player)) {
          Abilities.kill.action(targetPlayer, game, player);
        }
      }
    }
  }
  export const heal: Ability = {
    condition: Conditions.alwaysTrue,
    action: (targetPlayer: ClassicPlayer, game: Classic) => {
      console.log(targetPlayer.user.username + " has been healed.")
      targetPlayer.healed = true;
    },
  };
  export const getAlignment: Ability = {
    condition: Conditions.alwaysTrue,
    action: (
      targetPlayer: ClassicPlayer,
      game: Classic,
      player?: ClassicPlayer,
    ) => {
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
    action: (targetPlayer: ClassicPlayer, game: Classic) => {
      targetPlayer.roleBlocked = true;
    },
  };
  export const revive: Ability = {
    condition: Conditions.alwaysTrue,
    action: (targetPlayer: ClassicPlayer, game: Classic) => {
      if (!targetPlayer.alive) {
        game.revive(targetPlayer);
      }
    },
  };
  export const sendMessage: Ability = {
    condition: Conditions.alwaysTrue,
    action: (targetPlayer: ClassicPlayer, game: Classic) => {
      targetPlayer.user.send("You received some fruit!");
    },
  };
}
export function getRoleColor(role: Role): Colors {
  if (role.alignment == Alignment.town) {
    return Colors.brightGreen;
  } else if (role.alignment == Alignment.mafia) {
    return Colors.brightRed;
  } else {
    return <Colors>role.color;
  }
}
export function getRoleBackgroundColor(role: Role): Colors {
  if (role.alignment == Alignment.town) {
    return Colors.green;
  } else if (role.alignment == Alignment.mafia) {
    return Colors.red;
  } else {
    return role.backgroundColor ? role.backgroundColor : role.color as Colors;
  }
}
function mafia(role: Role) {
  return {
    roleName: "mafia " + role.roleName,
    alignment: Alignment.mafia,
    winCondition: WinConditions.mafia,
    abilities: role.abilities,
    passives: role.passives,
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
  export const mafiaVanilla: Role = {
    roleName: "mafia(vanilla)",
    alignment: Alignment.mafia,
    winCondition: WinConditions.mafia,
    abilities: [],
    passives: [],
  }
  export const mafioso: Role = {
    roleName: "mafioso",
    alignment: Alignment.mafia,
    winCondition: WinConditions.mafia,
    abilities: [{ ability: Abilities.mafiosoKill }],
    passives: [],
  };
  export const godfather: Role = {
    roleName: "godfather",
    alignment: Alignment.mafia,
    winCondition: WinConditions.mafia,
    abilities: [{ ability: Abilities.godfatherOrder }],
    passives: [Passives.nightImmune],
  };
  export const doctor: Role = {
    roleName: "doctor",
    alignment: Alignment.town,
    winCondition: WinConditions.town,
    abilities: [{ ability: Abilities.heal }],
    passives: [],
  };
  export const sherrif: Role = {
    roleName: "sherrif",
    alignment: Alignment.town,
    winCondition: WinConditions.town,
    abilities: [{ ability: Abilities.getAlignment }],
    passives: [],
  };
  export const townie: Role = {
    roleName: "townie",
    alignment: Alignment.town,
    winCondition: WinConditions.town,
    abilities: [],
    passives: [],
  };
  export const escort: Role = {
    roleName: "escort",
    alignment: Alignment.town,
    winCondition: WinConditions.town,
    abilities: [{ ability: Abilities.roleBlock }],
    passives: [Passives.roleblockImmune],
  };
  export const consort: Role = mafia(escort);
  export const survivor: Role = {
    roleName: "survivor",
    alignment: Alignment.neutral,
    winCondition: WinConditions.survive,
    color: Colors.brightYellow,
    backgroundColor: Colors.yellow,
    abilities: [],
    passives: [],
  };
  export const medium: Role = {
    roleName: "medium",
    alignment: Alignment.town,
    winCondition: WinConditions.town,
    abilities: [],
    passives: [Passives.speakWithDead],
  };
  export const jester: Role = {
    roleName: "jester",
    alignment: Alignment.neutral,
    winCondition: WinConditions.hanged,
    color: Colors.magenta,
    abilities: [],
    passives: [],
  };
  export const executioner: Role = {
    roleName: "executioner",
    alignment: Alignment.neutral,
    winCondition: WinConditions.lynchTarget,
    color: Colors.grey,
    abilities: [],
    passives: [],
  }
  export const retributionist: Role = {
    roleName: "retributionist",
    alignment: Alignment.town,
    winCondition: WinConditions.town,
    abilities: [{ ability: Abilities.revive, uses: 1 }],
    passives: [],
  };
  export const fruitVendor: Role = {
    roleName: "fruit vendor",
    alignment: Alignment.town,
    winCondition: WinConditions.town,
    abilities: [{ ability: Abilities.sendMessage }],
    passives: [],
  };
  export const serialKiller: Role = {
    roleName: "serial killer",
    alignment: Alignment.neutral,
    winCondition: WinConditions.lastOneStanding,
    color: Colors.darkBlue,
    abilities: [{ ability: Abilities.kill }],
    passives: [],
  };
  export const anyTown: Role = {
    roleName: "Any Town",
    alignment: Alignment.town,
    winCondition: WinConditions.undefined,
    abilities: [],
    passives: [],
  };
  export const any: Role = {
    roleName: "Any",
    alignment: Alignment.undefined,
    winCondition: WinConditions.undefined,
    abilities: [],
    passives: [],
  };
}

export const priorities = [
  Roles.consort,
  Roles.escort,
  Roles.fruitVendor,
  Roles.retributionist,
  Roles.doctor,
  Roles.godfather,
  Roles.mafioso,
  Roles.vigilante,
  Roles.sherrif,
  Roles.mafiaVanilla,
  Roles.townie,
  Roles.medium,
  Roles.survivor,
  Roles.jester,
  Roles.executioner
];
