"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const classic_1 = require("../games/classic/classic");
const server_1 = require("../core/server");
const user_1 = require("../core/user");
const classicPlayer_1 = require("../games/classic/classicPlayer");
const roles_1 = require("../games/classic/roles");
jest.mock("../core/server");
let server = new server_1.Server();
let roles = [roles_1.Roles.godfather, roles_1.Roles.mafioso, roles_1.Roles.doctor, roles_1.Roles.vigilante];
let users = [];
for (let i = 0; i < 4; i++) {
    users.push(new user_1.User(String(i), String(i)));
    users[i].setUsername(String(i));
}
let classic = initClassic();
beforeEach(() => {
    // refresh instance
    classic = initClassic();
});
afterAll(() => { });
function initClassic() {
    let classic = new classic_1.Classic(server, "test", "0");
    for (let i = 0; i < roles.length; i++) {
        classic.players.push(new classicPlayer_1.ClassicPlayer(users[i], roles[i]));
    }
    return classic;
}
function testTarget(subject, object) {
    let subjectPlayer = classic.getPlayer(subject);
    if (subjectPlayer) {
        subjectPlayer.target = object;
    }
    else {
        console.log("TESTING: There is no player: " + subject);
    }
}
test("mafia kill", () => {
    testTarget("1", "3");
    classic_1.Classic.nightResolution(classic);
    //@ts-ignore
    expect(classic.getPlayer("3").alive).toBe(false);
});
test("vigilante kill", () => {
    testTarget("3", "0");
    classic_1.Classic.nightResolution(classic);
    //@ts-ignore
    expect(classic.getPlayer("0").alive).toBe(false);
});
test("doctor save", () => {
    testTarget("0", "3");
    testTarget("2", "3");
    classic_1.Classic.nightResolution(classic);
    //@ts-ignore
    expect(classic.getPlayer("3").alive).toBe(true);
});
