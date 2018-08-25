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
"use strict"
let mainText = undefined;
let WebFontConfig = {
    custom: {
        families: ['Mercutio'],
        urls: ['/main.css']
    }
};
WebFont.load({
    custom: {
        families: ['Mercutio']
    },
    active: function () {
        mainText = new StandardMainTextList([new StandardMainText('')])
    }
});

class StandardMainText {
    constructor(text, color) {
        if (color == undefined) {
            color = 0xFFFFFF;
        } else {
            color = color.substr(1);
            color = "0x" + color;
            color = parseInt(color);
        }
        this.object = new PIXI.Text(text, {
            fontFamily: 'Mercutio',
            fontSize: 512,
            fill: color,
            align: 'center',
            resolution: 20
        });
        this.object.scale.x = 0.125;
        this.object.scale.y = 0.125;
    }
}

class StandardMainTextList {
    constructor(standardMainTextArray) {
        this.container = new PIXI.Container();
        app.stage.addChild(this.container);
        this.create(standardMainTextArray);
        this.fadeOutTimeout = undefined;
    }
    clear() {
        this.container.removeChildren();
    }
    create(standardMainTextArray) {
        this.clear();
        clearTimeout(this.fadeOutTimeout);
        //fade in if faded out
        this.container.alpha = 1;
        let point = 0;
        for (let i = 0; i < standardMainTextArray.length; i++) {
            standardMainTextArray[i].object.x = point;
            this.container.addChild(standardMainTextArray[i].object);
            point += standardMainTextArray[i].object.width;
        }
        this.reposition();
    }
    fadeOut(time) {
        this.fadeOutTimeout = setTimeout(function () {
            let fadingAnimation = setInterval(function () {
                this.container.alpha = this.container.alpha * 0.8;
                //if transparent enough to be invisible
                if (this.container.alpha < 0.01) {
                    this.container.alpha = 0;
                    clearInterval(fadingAnimation);
                }
            }.bind(this), 10);
        }.bind(this), time);
    }
    //called on window resize also
    reposition() {
        this.container.x = Math.floor(app.renderer.width / 2) - this.container.width / 2;
        this.container.y = 25;
    }
}
//set scaling to work well with pixel art
PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
let app = new PIXI.Application(800, 600, {
    backgroundColor: 0x2d2d2d
});
const playerTexture = new PIXI.Texture.fromImage('assets/swordplayerbreathing/sprite_0.png');
const playerTexture2 = new PIXI.Texture.fromImage('assets/swordplayerbreathing/sprite_1.png');
const playerTextureSelected = new PIXI.Texture.fromImage('assets/swordplayerbreathing/sprite_0_selected.png');
const playerTextureSelected2 = new PIXI.Texture.fromImage('assets/swordplayerbreathing/sprite_1_selected.png');
let players = [];
const stoneBlockTexture = new PIXI.Texture.fromImage('assets/stoneblock.png');

const stoneBlockContainer = new PIXI.Container();
app.stage.addChild(stoneBlockContainer);

class StoneBlock {
    constructor(stoneBlockTexture, x, y) {
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
            let stoneblock = new StoneBlock(stoneBlockTexture, x * 64, y * 64);
        }
    } else {
        for (let x = y - 11; x < 11 - y; x++) {
            let stoneblock = new StoneBlock(stoneBlockTexture, x * 64, y * 64);
        }
    }
}

stoneBlockContainer.pivot.y = stoneBlockContainer.height / 2;

app.stage.interactive = true;
app.stage.on('pointerdown', () => {
    if (user.inGame) {
        for (let i = 0; i < players.length; i++) {
            let unvoted = true;
            //test if this mousedown has changed anything (to guard against repeat presses)
            let active = false;
            if (!players[i].selected && players[i].votedFor) {
                players[i].votedFor = false;
                active = true;
                if (players[i].sprite.texture = playerTextureSelected) {
                    players[i].sprite.texture = playerTexture;
                } else {
                    players[i].sprite.texture = playerTexture2;
                }
            }
            for (let j = 0; j < players.length; j++) {
                if (players[j].votedFor) {
                    unvoted = false;
                }
            }
            if (unvoted && active && user.canVote) {
                user.socket.emit('message', '/unvote');
            }
        }
    }
})

user.socket.on('cancelVoteEffect', function () {
    cancelVote();
});
user.socket.on('selectPlayer', function (username) {
    selectPlayer(username.trim());
})

function cancelVote() {
    for (let i = 0; i < players.length; i++) {
        players[i].votedFor = false;
    }
}

let firstTimeSelectingPlayer = true;
let firstTimeSelectingInterval;

function selectPlayer(username) {
    //calling selectPlayer straight away the first time causes a bug - needs fixing
    if (firstTimeSelectingPlayer) {
        firstTimeSelectingInterval = setInterval(() => {
            for (let i = 0; i < players.length; i++) {
                if (players[i].username == username) {
                    players[i].votedFor = true;
                    firstTimeSelectingPlayer = false;
                    clearInterval(firstTimeSelectingInterval);
                    players[i].select();
                }
            }
        }, 50);
    } else {
        cancelVote();
        for (let i = 0; i < players.length; i++) {
            if (players[i].username == username) {
                players[i].votedFor = true;
            }
        }
    }
}

class Player {
    constructor(playerTexture, username, usernameColor) {
        this.sprite = new PIXI.Sprite(playerTexture);
        this.sprite.anchor.set(0.5, 0.5);
        this.sprite.interactive = true;
        this.selected = false;
        this.votedFor = false;
        this.sprite.on('pointerover', () => {
            this.selected = true;
            if (this.sprite.texture == playerTexture) {
                this.sprite.texture = playerTextureSelected;
            } else {
                this.sprite.texture = playerTextureSelected2;
            }
        })
        this.sprite.on('pointerout', () => {
            this.selected = false;
            if (this.sprite.texture == playerTextureSelected && !this.votedFor) {
                this.sprite.texture = playerTexture;
            } else if (!this.votedFor) {
                this.sprite.texture = playerTexture2;
            }
        })
        this.sprite.on('pointerdown', () => {
            if (user.inGame && user.canVote) {
                user.socket.emit('message', '/vote ' + username.trim());
                for (let i = 0; i < players.length; i++) {
                    players[i].votedFor = false;
                    if (players[i] != this) {
                        if (players[i].sprite.texture = playerTextureSelected) {
                            players[i].sprite.texture = playerTexture;
                        } else {
                            players[i].sprite.texture = playerTexture2;
                        }
                    }
                }
                this.votedFor = true;
            }
        })
        //this.sprite.scale.y = 2;
        usernameColor = 0xFFFFFF;
        this.frameCount = 0;
        players.push(this);
        app.stage.addChild(this.sprite);
        this.username = username.trim();
        this.usernameText = new PIXI.Text(username, {
            fontFamily: 'Mercutio',
            fontSize: 128,
            fill: usernameColor,
            align: 'center',
            resolution: 20
        });
        this.usernameText.scale.x = 0.25;
        this.usernameText.scale.y = 0.25;
        this.usernameText.x = Math.floor(this.sprite.x);
        this.usernameText.y = Math.floor(this.sprite.y - 45);
        this.usernameText.anchor.set(0.5, 0.5);
        app.stage.addChild(this.usernameText);
        setInterval(this.breathe.bind(this), 1500);
    }
    breathe() {
        if (this.frameCount % 2 == 0) {
            if (this.selected || this.votedFor) {
                this.sprite.texture = playerTextureSelected;
            } else {
                this.sprite.texture = playerTexture;
            }
        } else {
            if (this.selected || this.votedFor) {
                this.sprite.texture = playerTextureSelected2;
            } else {
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
    }
    destructor() {
        app.stage.removeChild(this.sprite);
        app.stage.removeChild(this.usernameText);
    }
    select() {
        if (this.sprite.texture == playerTexture) {
            this.sprite.texture = playerTextureSelected;
        } else {
            this.sprite.texture = playerTextureSelected2;
        }
    }
}
let gallowsTexture = new PIXI.Texture.fromImage('assets/gallows.png');
let gallowsSprite = new PIXI.Sprite(gallowsTexture);
gallowsSprite.anchor.set(0.5, 0.5);
gallowsSprite.scale.x = 2;
gallowsSprite.scale.y = 2;
gallowsSprite.x = Math.floor(app.renderer.width / 2);
gallowsSprite.y = Math.floor(app.renderer.height / 2) - 50;

let mainMessageClearTimeout;

function receiveMainMessage(text) {
    clearTimeout(mainMessageClearTimeout);
    setMainText(text);
    mainMessageClearTimeout = setTimeout(function () {
        setMainText("")
    }, 2000);
}

function removeAllPlayers() {
    for (let i = 0; i < players.length; i++) {
        players[i].destructor();
    }
    players = [];
    resize();
}

function removePlayer(username) {
    for (let i = 0; i < players.length; i++) {
        if (players[i].username == username) {
            players[i].destructor();
            players.splice(i, 1);
            resize();
        }
    }
}

function addPlayer(username, usernameColor) {
    const newPlayer = new Player(playerTexture, username, usernameColor);
    if (mainText) {
        app.stage.removeChild(mainText.container);
        app.stage.addChild(mainText.container);
    }
    resize();
}

function resize() {
    const parent = app.view.parentNode;
    app.renderer.resize(parent.clientWidth, parent.clientHeight);
    if (mainText) {
        mainText.reposition();
    }
    gallowsSprite.x = Math.floor(app.renderer.width / 2);
    gallowsSprite.y = Math.floor(app.renderer.height / 2) - 10;
    let positions = distributeInCircle(players.length, 170);
    for (let i = 0; i < players.length; i++) {
        players[i].setPos(gallowsSprite.x + positions[i][0], gallowsSprite.y + positions[i][1] + 20);
        if (positions[i][0] > 1) {
            players[i].sprite.scale.x = -1;
        } else {
            players[i].sprite.scale.x = 1;
        }
    }
    stoneBlockContainer.position.x = gallowsSprite.position.x + 33;
    stoneBlockContainer.position.y = gallowsSprite.position.y - 33;
}

function distributeInCircle(number, radius) {
    let positions = [];
    let angle = 2 * Math.PI / number;
    for (let i = 0; i < number; i++) {
        positions.push([radius * Math.sin(angle * i), radius * Math.cos(angle * i)]);
    }
    return positions;
}
$(window).resize(resize);
app.stage.addChild(gallowsSprite);
$('#canvasContainer').append(app.view);