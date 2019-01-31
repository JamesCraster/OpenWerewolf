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
const utils_1 = require("../../Core/utils");
var Alignment;
(function (Alignment) {
    Alignment["town"] = "town";
    Alignment["mafia"] = "mafia";
    Alignment["neutral"] = "neutral";
    Alignment["undefined"] = "undefined";
})(Alignment = exports.Alignment || (exports.Alignment = {}));
var Passives;
(function (Passives) {
    //cannot be killed at night
    Passives["nightImmune"] = "nightImmune";
    Passives["roleblockImmune"] = "roleblockImmune";
})(Passives || (Passives = {}));
var GameEndConditions;
(function (GameEndConditions) {
    //town wins if no mafia remain
    GameEndConditions.townWin = (game) => {
        for (let player of game.players) {
            if (player.alignment == Alignment.mafia && player.alive) {
                return false;
            }
        }
        return true;
    };
    //mafia wins if there are no town left alive, or there is just 1 town and 1 mafia (which would otherwise cause stalemate)
    GameEndConditions.mafiaWin = (game) => {
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
})(GameEndConditions = exports.GameEndConditions || (exports.GameEndConditions = {}));
var WinConditions;
(function (WinConditions) {
    WinConditions.town = (player, game) => {
        return GameEndConditions.townWin(game);
    };
    WinConditions.mafia = (player, game) => {
        return GameEndConditions.mafiaWin(game);
    };
    WinConditions.survive = (player, game) => {
        return player.alive;
    };
    WinConditions.hanged = (player, game) => {
        return player.hanged;
    };
    //make last one standing exclusive, except for survivors
    WinConditions.lastOneStanding = (player, game) => {
        let aliveCount = 0;
        for (let player of game.players) {
            if (player.alive) {
                aliveCount += 1;
            }
        }
        return player.alive && aliveCount <= 2;
    };
    WinConditions.undefined = (player, game) => {
        return false;
    };
})(WinConditions = exports.WinConditions || (exports.WinConditions = {}));
var Conditions;
(function (Conditions) {
    Conditions.alwaysTrue = (targetPlayer, game) => {
        return true;
    };
})(Conditions || (Conditions = {}));
var Abilities;
(function (Abilities) {
    Abilities.kill = {
        condition: (targetPlayer, game, player) => {
            if (targetPlayer.healed && player) {
                player.user.send("Your target was healed!");
            }
            return !targetPlayer.healed;
        },
        action: (targetPlayer, game) => {
            game.kill(targetPlayer);
        },
    };
    Abilities.heal = {
        condition: Conditions.alwaysTrue,
        action: (targetPlayer, game) => {
            targetPlayer.healed = true;
        },
    };
    Abilities.getAlignment = {
        condition: Conditions.alwaysTrue,
        action: (targetPlayer, game, player) => {
            if (player) {
                player.user.send("You investigated your target:");
                player.user.send(targetPlayer.user.username + " is a " + targetPlayer.alignment);
            }
        },
    };
    Abilities.roleBlock = {
        condition: Conditions.alwaysTrue,
        action: (targetPlayer, game) => {
            targetPlayer.roleBlocked = true;
        },
    };
})(Abilities || (Abilities = {}));
exports.Roles = {
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
        color: utils_1.Colors.yellow,
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
        color: utils_1.Colors.magenta,
        abilities: [],
        passives: [],
    },
    serialKiller: {
        roleName: "serial killer",
        alignment: Alignment.neutral,
        winCondition: WinConditions.lastOneStanding,
        color: utils_1.Colors.magenta,
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
exports.priorities = [
    exports.Roles.escort,
    exports.Roles.doctor,
    exports.Roles.godfather,
    exports.Roles.mafioso,
    exports.Roles.vigilante,
    exports.Roles.sherrif,
    exports.Roles.townie,
    exports.Roles.survivor,
    exports.Roles.jester,
];
//# sourceMappingURL=Roles.js.map