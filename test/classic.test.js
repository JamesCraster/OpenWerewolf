"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const classic_1 = require("../games/classic/classic");
const server_1 = require("../core/server");
const user_1 = require("../core/user");
const classicPlayer_1 = require("../games/classic/classicPlayer");
const roles_1 = require("../games/classic/roles");
jest.mock("../core/server");
beforeEach(() => {
    // Clear all instances and calls to constructor and all methods:
});
test('basic', () => {
    expect(0).toBe(0);
});
let server = new server_1.Server();
let roles = [roles_1.Roles.godfather, roles_1.Roles.mafioso, roles_1.Roles.doctor, roles_1.Roles.vigilante];
let users = [];
for (let i = 0; i < 4; i++) {
    users.push(new user_1.User(String(i), String(i)));
    users[i].setUsername(String(i));
}
test('mafia kill', () => {
    let players = [];
    for (let i = 0; i < roles.length; i++) {
        players.push(new classicPlayer_1.ClassicPlayer(users[i], roles[i]));
    }
    //@ts-ignore
    classic.getPlayer("0").target = "3";
    //@ts-ignore
    classic.nightResolution();
    //@ts-ignore
    classic.kill("0");
    console.log(classic.players.map(player => player.alive));
    //@ts-ignore
    expect(classic.getPlayer("0").alive).toBe(false);
});
test('vigilante kill', () => {
    let classic = new classic_1.Classic(server, "test", "0");
    for (let i = 0; i < roles.length; i++) {
        classic.players.push(new classicPlayer_1.ClassicPlayer(users[i], roles[i]));
    }
    classic.players[3].target = classic.players[0].user.id;
    //@ts-ignore
    classic.nightResolution();
    expect(classic.players[0].alive).toBe(false);
});
test('doctor save', () => {
    let classic = new classic_1.Classic(server, "test", "0");
    for (let i = 0; i < roles.length; i++) {
        classic.players.push(new classicPlayer_1.ClassicPlayer(users[i], roles[i]));
    }
    classic.players[0].target = classic.players[3].user.id;
    classic.players[2].target = classic.players[3].user.id;
    //@ts-ignore
    classic.nightResolution();
    expect(classic.players[3].alive).toBe(false);
});
