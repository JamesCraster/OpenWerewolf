import { Classic } from "../games/classic/classic";
import { Server } from "../core/server";
import { User } from "../core/user";
import { ClassicPlayer } from "../games/classic/classicPlayer";
import {
  Roles,
  Role,
  GameEndConditions,
} from "../games/classic/roles";

let server = new Server();
function initClassic(roles: Array<Role>) {
  let users: Array<User> = [];
  for (let i = 0; i < roles.length; i++) {
    users.push(new User(String(i), String(i)));
    users[i].setUsername(String(i));
  }
  let classic = new Classic(server, "test", "0");
  for (let i = 0; i < roles.length; i++) {
    classic.players.push(new ClassicPlayer(users[i], roles[i]));
  }
  return classic;
}
describe("Test basic night actions", () => {
  let roles = [
    Roles.godfather,
    Roles.mafioso,
    Roles.doctor,
    Roles.vigilante,
    Roles.escort,
    Roles.consort,
  ];

  let classic = initClassic(roles);

  beforeEach(() => {
    // refresh instance
    classic = initClassic(roles);
  });

  function testTarget(subject: string, object: string) {
    let subjectPlayer = classic.getPlayer(subject);
    if (subjectPlayer) {
      subjectPlayer.target = object;
    } else {
      console.log("TESTING: There is no player: " + subject);
    }
  }

  test("godfather kills without mafioso decision", () => {
    testTarget("0", "3");
    Classic.nightResolution(classic);
    //@ts-ignore
    expect(classic.getPlayer("3").alive).toBe(false);
  });
  test("godfather kills when mafioso is roleblocked", () => {
    testTarget("0", "4");
    testTarget("1", "3");
    testTarget("4", "1");
    Classic.nightResolution(classic);
    //@ts-ignore
    expect(classic.getPlayer("3").alive).toBe(true);
    //@ts-ignore
    expect(classic.getPlayer("4").alive).toBe(false);
  });
  test("godfather's order overrides mafioso decision", () => {
    testTarget("0", "4");
    testTarget("1", "3");
    Classic.nightResolution(classic);
    //@ts-ignore
    expect(classic.getPlayer("3").alive).toBe(true);
    //@ts-ignore
    expect(classic.getPlayer("4").alive).toBe(false);
  });
  test("godfather's order unaffected by roleblock", () => {
    testTarget("0", "4");
    testTarget("1", "3");
    testTarget("4", "0");
    Classic.nightResolution(classic);
    //@ts-ignore
    expect(classic.getPlayer("3").alive).toBe(true);
    //@ts-ignore
    expect(classic.getPlayer("4").alive).toBe(false);
  });
  test("mafioso kill", () => {
    testTarget("1", "3");
    Classic.nightResolution(classic);
    //@ts-ignore
    expect(classic.getPlayer("3").alive).toBe(false);
  });

  test("vigilante kill", () => {
    testTarget("3", "0");
    Classic.nightResolution(classic);
    //@ts-ignore
    expect(classic.getPlayer("0").alive).toBe(false);
  });

  test("doctor saves from mafia", () => {
    testTarget("0", "3");
    testTarget("2", "3");
    Classic.nightResolution(classic);
    //@ts-ignore
    expect(classic.getPlayer("3").alive).toBe(true);
  });

  test("doctor saves from vigilante", () => {
    testTarget("3", "4");
    testTarget("2", "4");
    Classic.nightResolution(classic);
    //@ts-ignore
    expect(classic.getPlayer("3").alive).toBe(true);
  });

  test("escort roleblocks", () => {
    testTarget("1", "3");
    testTarget("4", "1");
    Classic.nightResolution(classic);
    //@ts-ignore
    expect(classic.getPlayer("3").alive).toBe(true);
  });

  test("consort roleblocks", () => {
    testTarget("1", "3");
    testTarget("5", "1");
    Classic.nightResolution(classic);
    //@ts-ignore
    expect(classic.getPlayer("3").alive).toBe(true);
  });
});

describe("Test basic win conditions", () => {
  test("town wins if no mafia", () => {
    let roles = [Roles.doctor, Roles.vigilante, Roles.escort];
    let classic = initClassic(roles);
    expect(GameEndConditions.townWin(classic)).toBe(true);
  });
  test("town does not win if mafia exist", () => {
    let roles = [Roles.godfather, Roles.vigilante, Roles.escort];
    let classic = initClassic(roles);
    expect(GameEndConditions.townWin(classic)).toBe(false);
  });
  test("one town and one mafia is a mafia win", () => {
    let roles = [Roles.godfather, Roles.vigilante];
    let classic = initClassic(roles);
    expect(GameEndConditions.townWin(classic)).toBe(false);
    expect(GameEndConditions.mafiaWin(classic)).toBe(true);
  });
  test("mafia wins if they outnumber town", () => {
    let roles = [Roles.godfather, Roles.mafioso, Roles.vigilante];
    let classic = initClassic(roles);
    expect(GameEndConditions.townWin(classic)).toBe(false);
    expect(GameEndConditions.mafiaWin(classic)).toBe(true);
  });
  test("mafia does not win if they do not outnumber town", () => {
    let roles = [Roles.godfather, Roles.mafioso, Roles.vigilante, Roles.doctor];
    let classic = initClassic(roles);
    expect(GameEndConditions.townWin(classic)).toBe(false);
    expect(GameEndConditions.mafiaWin(classic)).toBe(false);
  });
});
