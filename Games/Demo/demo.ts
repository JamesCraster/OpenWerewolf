"use strict";

import { MessageRoom, Server, Game, Player, Utils, RoleList, Colors, Stopwatch } from "../../core";

export class Demo extends Game{
    private playerchat:MessageRoom = new MessageRoom();
    constructor(server:Server){
        super(server,3,6);
    }
    public start(){
        this.beforeStart();
    }
    public end(){
        this.afterEnd();
    }
    public update(){

    }
    public addPlayer(player:Player){
        this.playerchat.addPlayer(player);
        super.addPlayer(player);
    }
    public receive(id:string, msg:string){
        let player = this.getPlayer(id);
            if(player instanceof Player){
                this.playerchat.receive(id, msg);
            }
        }
    }