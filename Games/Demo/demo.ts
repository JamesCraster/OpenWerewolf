"use strict";

import { MessageRoom, Server, Game, Player, Utils, RoleList, Colors, Stopwatch } from "../../core";

export class Demo extends Game {
    //declare new message room
    private playerchat: MessageRoom = new MessageRoom();
    constructor(server: Server) {
        //first argument is minimum player count, second is maximum player count
        super(server, 3, 6);
    }
    public start() {
        this.beforeStart();
    }
    public end() {
        this.afterEnd();
    }
    public update() {

    }
    public addPlayer(player: Player) {
        //add player to message room
        this.playerchat.addPlayer(player);
        super.addPlayer(player);
    }
    public receive(player: Player, msg: string) {
        //direct player's message to message room
        this.playerchat.receive(player, player.username + ": " + msg);
    }
}