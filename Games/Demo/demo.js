"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("../../core");
class Demo extends core_1.Game {
    constructor(server) {
        //first argument is minimum player count, second is maximum player count
        super(server, 3, 6);
        //declare new message room
        this.playerchat = new core_1.MessageRoom();
    }
    start() {
        this.beforeStart();
    }
    end() {
        this.afterEnd();
    }
    update() {
    }
    addPlayer(player) {
        //add player to message room
        this.playerchat.addPlayer(player);
        super.addPlayer(player);
    }
    receive(player, msg) {
        //direct player's message to message room
        this.playerchat.receive(player, player.username + ": " + msg);
    }
}
exports.Demo = Demo;
