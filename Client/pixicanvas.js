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
        mainText = new StandardMainTextList();
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
    constructor(textArray) {
        this.container = new PIXI.Container();
        app.stage.addChild(this.container);
        this.fadeOutTimeout = undefined;
        this.textShownDuration = 2500;
        this.queue = [];
        if (textArray != undefined) {
            this.push(textArray)
        }
    }
    clear() {
        this.container.removeChildren();
    }
    push(textArray) {
        console.log('input:');
        console.log(textArray);
        this.queue.unshift(textArray);
        console.log('queue:')
        console.log(this.queue);
        //if this is the only element in the queue, then render it now
        if (this.queue.length == 1) {
            this.render(this.queue[this.queue.length - 1]);
        }
    }
    render(textArray) {
        clearInterval(this.fadeOutTimeout);
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
        this.fadeOutTimeout = setTimeout(function () {
            let fadingAnimation = setInterval(function () {
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
            }.bind(this), 10);
        }.bind(this), this.textShownDuration);
    }
    //called on window resize in addition to when rerendering happens
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
let firstTimeNumberOfRuns = 0;

function selectPlayer(username) {
    //calling selectPlayer straight away the first time causes a bug
    //because not all of the players have been added yet.
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
            //stop running loop after 10 seconds if no match found
            firstTimeNumberOfRuns++;
            if (firstTimeNumberOfRuns > 100) {
                clearInterval(firstTimeSelectingInterval);
            }
        }, 100);
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
            if (user.inGame && user.canVote && !this.votedFor) {
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
let gallowsHangingAnimation = [];
gallowsHangingAnimation.push(new PIXI.Texture.fromImage('assets/swordplayerhanging/sprite_hanging0.png'));
gallowsHangingAnimation.push(new PIXI.Texture.fromImage('assets/swordplayerhanging/sprite_hanging1.png'));
gallowsHangingAnimation.push(new PIXI.Texture.fromImage('assets/swordplayerhanging/sprite_hanging2.png'));
gallowsHangingAnimation.push(new PIXI.Texture.fromImage('assets/swordplayerhanging/sprite_hanging3.png'));

class Gallows {
    constructor() {
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
        this.hangingInterval = setInterval(function () {
            this.counter++;
            this.sprite.texture = gallowsHangingAnimation[this.counter];
            if (this.counter == 3) {
                clearInterval(this.hangingInterval);
            }
        }.bind(this), 25);
    }
    reset() {
        this.sprite.texture = gallowsTexture;
        this.sprite.scale.x = 2;
        this.sprite.scale.y = 2;
    }
}

let gallows = new Gallows();

user.socket.on('hang', function (usernames) {
    //make invisible all those players who username matches one on the list
    for (let i = 0; i < players.length; i++) {
        for (let j = 0; j < usernames.length; j++) {
            if (players[i].username == usernames[j]) {
                players[i].sprite.visible = false;
                players[i].usernameText.visible = false;
            }
        }
    }
    //hanging animation
    gallows.hang();
});

user.socket.on('resetGallows', function () {
    gallows.reset();
})

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
    gallows.sprite.x = Math.floor(app.renderer.width / 2);
    gallows.sprite.y = Math.floor(app.renderer.height / 2) - 10;
    let positions = distributeInCircle(players.length, 170);
    for (let i = 0; i < players.length; i++) {
        players[i].setPos(gallows.sprite.x + positions[i][0], gallows.sprite.y + positions[i][1] + 20);
        if (positions[i][0] > 1) {
            players[i].sprite.scale.x = -1;
        } else {
            players[i].sprite.scale.x = 1;
        }
    }
    stoneBlockContainer.position.x = gallows.sprite.position.x + 33;
    stoneBlockContainer.position.y = gallows.sprite.position.y - 33;
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
app.stage.addChild(gallows.sprite);
$('#canvasContainer').append(app.view);