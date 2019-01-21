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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const internal_1 = require("./internal");
const WebFont = __importStar(require("webfontloader"));
const PIXI = __importStar(require("pixi.js"));
exports.mainText = undefined;
let WebFontConfig = {
    custom: {
        families: ["Mercutio"],
        urls: ["/main.css"],
    },
};
WebFont.load({
    custom: {
        families: ["Mercutio"],
    },
    active: function () {
        exports.mainText = new StandardMainTextList();
    },
});
class StandardMainText {
    constructor(text, color) {
        if (color == undefined) {
            color = 0xffffff;
        }
        else {
            //color = color.substr(1);
            //color = "0x" + color;
            //color = parseInt(color);
        }
        this.object = new PIXI.Text(text, {
            fontFamily: "Mercutio",
            fontSize: 512,
            fill: color,
            align: "center",
        });
        this.object.scale.x = 0.125;
        this.object.scale.y = 0.125;
    }
}
exports.StandardMainText = StandardMainText;
class StandardMainTextList {
    constructor(textArray) {
        this.fadeOutTimeout = undefined;
        this.textShownDuration = 2500;
        this.container = new PIXI.Container();
        app.stage.addChild(this.container);
        this.textShownDuration = 2500;
        this.queue = [];
        if (textArray != undefined) {
            this.push(textArray);
        }
    }
    clear() {
        this.container.removeChildren();
    }
    push(textArray) {
        this.queue.unshift(textArray);
        //if this is the only element in the queue, then render it now
        if (this.queue.length == 1) {
            this.render(this.queue[this.queue.length - 1]);
        }
    }
    render(textArray) {
        if (this.fadeOutTimeout) {
            clearInterval(this.fadeOutTimeout);
        }
        this.clear();
        this.container.alpha = 1;
        let point = 0;
        for (let i = 0; i < textArray.length; i++) {
            textArray[i].object.x = point;
            this.container.addChild(textArray[i].object);
            point += textArray[i].object.width;
        }
        this.reposition();
        //render the next one after a delay
        this.fadeOutTimeout = setTimeout(() => {
            let fadingAnimation = setInterval(() => {
                this.container.alpha = this.container.alpha * 0.8;
                //if transparent enough to be invisible, stop fading out and show next text
                if (this.container.alpha < 0.01) {
                    this.container.alpha = 0;
                    clearInterval(fadingAnimation);
                    this.queue.pop();
                    if (this.queue.length != 0) {
                        this.render(this.queue[this.queue.length - 1]);
                    }
                }
            }, 10);
        }, this.textShownDuration);
    }
    //called on window resize in addition to when rerendering happens
    reposition() {
        this.container.x =
            Math.floor(app.renderer.width / 2) - this.container.width / 2;
        this.container.y = 25;
    }
}
//set scaling to work well with pixel art
PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
let app = new PIXI.Application(800, 600, {
    backgroundColor: 0x2d2d2d,
});
const playerTexture = PIXI.Texture.fromImage("assets/swordplayerbreathing/sprite_0.png");
const playerTexture2 = PIXI.Texture.fromImage("assets/swordplayerbreathing/sprite_1.png");
const playerTextureSelected = PIXI.Texture.fromImage("assets/swordplayerbreathing/sprite_0_selected.png");
const playerTextureSelected2 = PIXI.Texture.fromImage("assets/swordplayerbreathing/sprite_1_selected.png");
const graveTexture = PIXI.Texture.fromImage("assets/grave.png");
let players = [];
const stoneBlockTexture = PIXI.Texture.fromImage("assets/stoneblock.png");
const stoneBlockContainer = new PIXI.Container();
app.stage.addChild(stoneBlockContainer);
class StoneBlock {
    constructor(x, y) {
        this.sprite = new PIXI.Sprite(stoneBlockTexture);
        this.sprite.pivot.x = 0.5;
        this.sprite.pivot.y = 0.5;
        this.sprite.x = x;
        this.sprite.y = y;
        this.sprite.scale.x = 2;
        this.sprite.scale.y = 2;
        this.sprite.anchor.set(0.5, 0.5);
        stoneBlockContainer.addChild(this.sprite);
    }
}
let level = 11;
for (let y = 0; y < level; y++) {
    if (y < 6) {
        for (let x = -y; x < y; x++) {
            let stoneblock = new StoneBlock(x * 64, y * 64);
        }
    }
    else {
        for (let x = y - 11; x < 11 - y; x++) {
            let stoneblock = new StoneBlock(x * 64, y * 64);
        }
    }
}
stoneBlockContainer.pivot.y = stoneBlockContainer.height / 2;
app.stage.interactive = true;
app.stage.on("pointerdown", () => {
    if (internal_1.user.inGame) {
        for (let i = 0; i < players.length; i++) {
            //assume that the player is unvoting
            let unvoted = true;
            //test if this mousedown has changed anything (to guard against repeat presses)
            let active = false;
            if (!players[i].selected && players[i].votedFor) {
                players[i].votedFor = false;
                active = true;
                if ((players[i].sprite.texture = playerTextureSelected)) {
                    players[i].sprite.texture = playerTexture;
                }
                else {
                    players[i].sprite.texture = playerTexture2;
                }
            }
            for (let j = 0; j < players.length; j++) {
                if (players[j].votedFor) {
                    unvoted = false;
                }
            }
            if (unvoted && active && internal_1.user.canVote) {
                internal_1.user.socket.emit("message", "/unvote");
            }
        }
    }
});
internal_1.user.socket.on("cancelVoteEffect", function () {
    cancelVote();
});
internal_1.user.socket.on("selectPlayer", function (username) {
    selectPlayer(username.trim());
});
internal_1.user.socket.on("finalVerdict", function () {
    $("#guiltyButtons").show();
});
internal_1.user.socket.on("endVerdict", function () {
    $("#guiltyButtons").hide();
});
$("#guiltyButton").on("click", function () {
    internal_1.user.socket.emit("message", "/guilty");
});
$("#innocentButton").on("click", function () {
    internal_1.user.socket.emit("message", "/innocent");
});
function cancelVote() {
    for (let i = 0; i < players.length; i++) {
        players[i].votedFor = false;
    }
}
let firstTimeSelectingPlayer = true;
let firstTimeSelectingInterval = undefined;
let firstTimeNumberOfRuns = 0;
function markAsDead(username) {
    for (let i = 0; i < players.length; i++) {
        if (players[i].username == username) {
            players[i].disappear();
        }
    }
}
exports.markAsDead = markAsDead;
function selectPlayer(username) {
    //calling selectPlayer straight away the first time causes a bug
    //because not all of the players have been added yet.
    if (firstTimeSelectingPlayer) {
        firstTimeSelectingInterval = setInterval(() => {
            for (let i = 0; i < players.length; i++) {
                if (players[i].username == username) {
                    players[i].votedFor = true;
                    firstTimeSelectingPlayer = false;
                    if (firstTimeSelectingInterval) {
                        clearInterval(firstTimeSelectingInterval);
                    }
                    players[i].select();
                }
            }
            //stop running loop after 10 seconds if no match found
            firstTimeNumberOfRuns++;
            if (firstTimeNumberOfRuns > 100 && firstTimeSelectingInterval) {
                clearInterval(firstTimeSelectingInterval);
            }
        }, 100);
    }
    else {
        cancelVote();
        for (let i = 0; i < players.length; i++) {
            if (players[i].username == username) {
                players[i].votedFor = true;
            }
        }
    }
}
class Player {
    constructor(username) {
        this.username = username;
        this.sprite = new PIXI.Sprite(playerTexture);
        this.sprite.anchor.set(0.5, 0.5);
        this.sprite.interactive = true;
        this.selected = false;
        this.votedFor = false;
        this.breatheAnimation = undefined;
        this.frameCount = 0;
        this.graveSprite = new PIXI.Sprite(graveTexture);
        this.sprite.on("pointerover", () => {
            this.selected = true;
            if (this.sprite.texture == playerTexture) {
                this.sprite.texture = playerTextureSelected;
            }
            else {
                this.sprite.texture = playerTextureSelected2;
            }
        });
        this.sprite.on("pointerout", () => {
            this.selected = false;
            if (this.sprite.texture == playerTextureSelected && !this.votedFor) {
                this.sprite.texture = playerTexture;
            }
            else if (!this.votedFor) {
                this.sprite.texture = playerTexture2;
            }
        });
        this.sprite.on("pointerdown", () => {
            if (internal_1.user.inGame && internal_1.user.canVote && !this.votedFor) {
                internal_1.user.socket.emit("message", "/vote " + username.trim());
                for (let i = 0; i < players.length; i++) {
                    players[i].votedFor = false;
                    if (players[i] != this) {
                        if ((players[i].sprite.texture = playerTextureSelected)) {
                            players[i].sprite.texture = playerTexture;
                        }
                        else {
                            players[i].sprite.texture = playerTexture2;
                        }
                    }
                }
                this.votedFor = true;
            }
        });
        //this.sprite.scale.y = 2;
        let usernameColor = 0xffffff;
        this.frameCount = 0;
        players.push(this);
        app.stage.addChild(this.sprite);
        this.username = username.trim();
        this.usernameText = new PIXI.Text(username, {
            fontFamily: "Mercutio",
            fontSize: 128,
            fill: usernameColor,
            align: "center",
        });
        this.usernameText.scale.x = 0.25;
        this.usernameText.scale.y = 0.25;
        this.usernameText.x = Math.floor(this.sprite.x);
        this.usernameText.y = Math.floor(this.sprite.y - 45);
        this.usernameText.anchor.set(0.5, 0.5);
        app.stage.addChild(this.usernameText);
        //this.breatheAnimation = setInterval(this.breathe.bind(this), 1500);
    }
    breathe() {
        if (this.frameCount % 2 == 0) {
            if (this.selected || this.votedFor) {
                this.sprite.texture = playerTextureSelected;
            }
            else {
                this.sprite.texture = playerTexture;
            }
        }
        else {
            if (this.selected || this.votedFor) {
                this.sprite.texture = playerTextureSelected2;
            }
            else {
                this.sprite.texture = playerTexture2;
            }
        }
        this.frameCount++;
    }
    setPos(x, y) {
        this.sprite.x = Math.floor(x);
        this.sprite.y = Math.floor(y);
        this.usernameText.x = Math.floor(x);
        this.usernameText.y = Math.floor(y - 45);
        if (this.graveSprite) {
            this.graveSprite.x = Math.floor(x);
            this.graveSprite.y = Math.floor(y);
        }
    }
    destructor() {
        app.stage.removeChild(this.sprite);
        app.stage.removeChild(this.usernameText);
        app.stage.removeChild(this.graveSprite);
    }
    //could more accurately be called 'die'
    disappear() {
        this.sprite.visible = false;
        this.graveSprite.anchor.set(0.5, 0.5);
        this.graveSprite.scale.x = 2;
        this.graveSprite.scale.y = 2;
        app.stage.addChild(this.graveSprite);
        resize();
    }
    select() {
        if (this.sprite.texture == playerTexture) {
            this.sprite.texture = playerTextureSelected;
        }
        else {
            this.sprite.texture = playerTextureSelected2;
        }
    }
}
let gallowsTexture = PIXI.Texture.fromImage("assets/gallows.png");
let gallowsHangingAnimation = [];
gallowsHangingAnimation.push(PIXI.Texture.fromImage("assets/swordplayerhanging/sprite_hanging0.png"));
gallowsHangingAnimation.push(PIXI.Texture.fromImage("assets/swordplayerhanging/sprite_hanging1.png"));
gallowsHangingAnimation.push(PIXI.Texture.fromImage("assets/swordplayerhanging/sprite_hanging2.png"));
gallowsHangingAnimation.push(PIXI.Texture.fromImage("assets/swordplayerhanging/sprite_hanging3.png"));
class Gallows {
    constructor() {
        this.counter = 0;
        this.hangingInterval = undefined;
        this.sprite = new PIXI.Sprite(gallowsTexture);
        this.sprite.anchor.set(0.5, 0.5);
        this.sprite.scale.x = 2;
        this.sprite.scale.y = 2;
        this.sprite.x = Math.floor(app.renderer.width / 2);
        this.sprite.y = Math.floor(app.renderer.height / 2) - 50;
    }
    hang() {
        this.sprite.texture = gallowsHangingAnimation[0];
        this.sprite.scale.x = 1;
        this.sprite.scale.y = 1;
        this.counter = 0;
        this.hangingInterval = setInterval(() => {
            this.counter++;
            this.sprite.texture = gallowsHangingAnimation[this.counter];
            if (this.counter == 3 && this.hangingInterval) {
                clearInterval(this.hangingInterval);
            }
        }, 25);
    }
    reset() {
        this.sprite.texture = gallowsTexture;
        this.sprite.scale.x = 2;
        this.sprite.scale.y = 2;
    }
}
exports.gallows = new Gallows();
internal_1.user.socket.on("hang", function (usernames) {
    //make invisible all those players who username matches one on the list
    for (let i = 0; i < players.length; i++) {
        for (let j = 0; j < usernames.length; j++) {
            if (players[i].username == usernames[j]) {
                players[i].sprite.visible = false;
                //players[i].usernameText.visible = false;
            }
        }
    }
    //hanging animation
    exports.gallows.hang();
});
internal_1.user.socket.on("resetGallows", function () {
    exports.gallows.reset();
});
function removeAllPlayers() {
    for (let i = 0; i < players.length; i++) {
        players[i].destructor();
    }
    players = [];
    resize();
}
exports.removeAllPlayers = removeAllPlayers;
function removePlayer(username) {
    for (let i = 0; i < players.length; i++) {
        if (players[i].username == username) {
            players[i].destructor();
            players.splice(i, 1);
            resize();
        }
    }
}
exports.removePlayer = removePlayer;
function addPlayer(username) {
    const newPlayer = new Player(username);
    if (exports.mainText) {
        app.stage.removeChild(exports.mainText.container);
        app.stage.addChild(exports.mainText.container);
    }
    resize();
}
exports.addPlayer = addPlayer;
function resize() {
    const parent = app.view.parentNode;
    app.renderer.resize(parent.clientWidth, parent.clientHeight);
    if (exports.mainText) {
        exports.mainText.reposition();
    }
    exports.gallows.sprite.x = Math.floor(app.renderer.width / 2);
    exports.gallows.sprite.y = Math.floor(app.renderer.height / 2) - 10;
    let positions = distributeInCircle(players.length, 170);
    for (let i = 0; i < players.length; i++) {
        players[i].setPos(exports.gallows.sprite.x + positions[i][0], exports.gallows.sprite.y + positions[i][1] + 20);
        if (positions[i][0] > 1) {
            players[i].sprite.scale.x = -1;
        }
        else {
            players[i].sprite.scale.x = 1;
        }
    }
    stoneBlockContainer.position.x = exports.gallows.sprite.position.x + 33;
    stoneBlockContainer.position.y = exports.gallows.sprite.position.y - 33;
}
exports.resize = resize;
function distributeInCircle(number, radius) {
    let positions = [];
    let angle = (2 * Math.PI) / number;
    for (let i = 0; i < number; i++) {
        positions.push([
            radius * Math.sin(angle * i),
            radius * Math.cos(angle * i),
        ]);
    }
    return positions;
}
$(window).resize(resize);
app.stage.addChild(exports.gallows.sprite);
$("#canvasContainer").append(app.view);
//# sourceMappingURL=pixicanvas.js.map