import { Classic } from "../games/classic/classic";
import { Server } from "../core/server";
import { User } from "../core/user";
import { ClassicPlayer } from "../games/classic/classicPlayer";
import { Roles, priorities } from "../games/classic/roles";
jest.mock("../core/server");
beforeEach(() => {
    // Clear all instances and calls to constructor and all methods:
});


test('basic', () => {
    expect(0).toBe(0);
});

let server = new Server();
let roles = [Roles.godfather, Roles.mafioso, Roles.doctor, Roles.vigilante];
let users: Array<User> = [];
for (let i = 0; i < 4; i++) {
    users.push(new User(String(i), String(i)));
    users[i].setUsername(String(i));
}


test('mafia kill', () => {
    let classic = new Classic(server, "test", "0");
    for (let i = 0; i < roles.length; i++) {
        classic.players.push(new ClassicPlayer(users[i], roles[i]));
    }
    //@ts-ignore
    classic.getPlayer("1").target = "3";

    Classic.nightResolution(classic);

    console.log(classic.players.map(player => player.alive));
    //@ts-ignore
    expect(classic.getPlayer("3").alive).toBe(false);
});

test('vigilante kill', () => {
    let classic = new Classic(server, "test", "0");
    for (let i = 0; i < roles.length; i++) {
        classic.players.push(new ClassicPlayer(users[i], roles[i]));
    }
    //@ts-ignore
    classic.getPlayer("3").target = "0";

    Classic.nightResolution(classic);
    //@ts-ignore
    expect(classic.getPlayer("0").alive).toBe(false);
});

test('doctor save', () => {
    let classic = new Classic(server, "test", "0");
    for (let i = 0; i < roles.length; i++) {
        classic.players.push(new ClassicPlayer(users[i], roles[i]));
    }
    //@ts-ignore
    classic.getPlayer("0").target = "3";
    //@ts-ignore
    classic.getPlayer("2").target = "3";

    Classic.nightResolution(classic);
    //@ts-ignore
    expect(classic.getPlayer("3").alive).toBe(true);
});
