"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("../../core");
class Demo extends core_1.Game {
    constructor(server) {
        super(server, 3, 6);
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
        this.playerchat.addPlayer(player);
        super.addPlayer(player);
    }
    receive(id, msg) {
        let player = this.getPlayer(id);
        if (player instanceof core_1.Player) {
            this.playerchat.receive(id, msg);
        }
    }
}
exports.Demo = Demo;
