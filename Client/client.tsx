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
import * as React from "react";
import * as ReactDOM from "react-dom";
import LobbyItem from "./components";
declare let SimpleBar: any;

type Message = Array<{ text: string; color: string; backgroundColor: string }>;

enum States {
  NOTASSIGNEDGAME = "NOT ASSIGNED GAME",
  INGAMEWAITING = "IN GAME WAITING",
  INGAMEPLAYING = "IN GAME PLAYING",
  GAMEENDED = "GAME ENDED",
}
class LeaveGameButton {
  public action: () => void = () => {};
  constructor() {}
  setinPlayClick() {
    $("#leaveGame").off("click");
    this.action = function() {
      $("#leaveGameModal").modal("show");
    };
    $("#leaveGame").click(this.action);
  }
  setNotInPlayClick() {
    $("#leaveGame").off("click");
    this.action = function() {
      console.log(user.inGame);
      if (!user.inGame) {
        transitionFromGameToLobby();
        user.socket.emit("leaveGame");
        user.restart();
      }
    };
    $("#leaveGame").click(this.action);
  }
}
let leaveGameButton = new LeaveGameButton();
export class User {
  private _state: States = States.NOTASSIGNEDGAME;
  public socket = io();
  public now = 0;
  public time = 0;
  public warn = -1;
  public gameClicked = false;
  public registered = false;
  public canVote = false;
  public username: string = "";
  constructor() {
    this.socket = io();
    this.now = 0;
    this.time = 0;
    this.warn = -1;
    this.gameClicked = false;
    this.registered = false;
    this.canVote = false;
    setInterval(this.updateTime.bind(this), 1000);
  }
  get inGame() {
    return this.state == States.INGAMEPLAYING;
  }
  isState(state: States) {
    return this.state == state;
  }
  set state(inputState) {
    if (inputState == States.INGAMEPLAYING) {
      leaveGameButton.setinPlayClick();
    }
    this._state = inputState;
  }
  get state() {
    return this._state;
  }
  restart() {
    transitionFromGameToLobby();
    this.state = States.NOTASSIGNEDGAME;
    this.registered = false;
    this.now = 0;
    this.time = 0;
    this.warn = -1;
    $("#playerNames").empty();
    $("#playerNames").append('<li class="gameli">Players:</li>');
    $("#roleNames").empty();
    $("#gameClock").text("Time: 00:00");
    $("#gameClock").css("color", "#cecece");
    $("#roleNames").append('<li class="gameli">Roles:</li>');
    $("#chatbox").empty();
    $("#leaveGame").off("click");
    leaveGameButton.setNotInPlayClick();
    //clear the gallows
    gallows.reset();
  }
  //convert number of seconds into minute:second format
  convertTime(duration: number) {
    let seconds = Math.floor((duration / 1000) % 60);
    let minutes = Math.floor((duration / (1000 * 60)) % 60);
    let minuteString = minutes < 10 ? `0${minutes}` : `${minutes}`;
    let secondString = seconds < 10 ? `0${seconds}` : `${seconds}`;
    return minuteString + ":" + secondString;
  }
  updateTime() {
    if (this.time > 0) {
      this.time -= Date.now() - user.now;
      this.now = Date.now();
      if (this.time < 0) {
        this.time = 0;
        $("#gameClock").css("color", "#cecece");
        this.warn = -1;
      }
      $("#gameClock").text("Time: " + this.convertTime(user.time));
      if (this.time <= this.warn && this.time >= 0) {
        $("#gameClock").css("color", "#ff1b1b");
      }
    } else {
      $("#gameClock").text("Time: " + this.convertTime(0));
    }
  }
  register() {
    this.registered = true;
  }
}
export const user = new User();

function lobbyItemClick(item: HTMLElement) {
  user.gameClicked = true;
  if (user.isState(States.NOTASSIGNEDGAME)) {
    transitionFromLobbyToGame($(item).attr("name"));
  } else {
    transitionFromLobbyToGame();
  }
  location.hash = "3";
  if ($(item).attr("inPlay") == "false") {
    if (user.isState(States.NOTASSIGNEDGAME)) {
      $("#chatbox").empty();
      $("#playerNames").empty();
      removeAllPlayers();
      $("#playerNames").append("<li class='gameli'>Players:</li>");
      let usernameList = $(
        ".lobbyItem[uid=" + $(item).attr("uid") + "] .username",
      );
      for (let i = 0; i < usernameList.length; i++) {
        appendMessage(
          [
            {
              text: $(usernameList[i]).text(),
              color: $(usernameList[i]).css("color"),
            },
          ],
          "#playerNames",
        );
        addPlayer($(usernameList[i]).text());
      }
      user.socket.emit("gameClick", $(item).attr("uid"));
      user.state = States.INGAMEWAITING;
    }
  } else {
    if (user.isState(States.NOTASSIGNEDGAME)) {
      $("#playerNames").empty();
      removeAllPlayers();
      $("#playerNames").append("<li class='gameli'>Players:</li>");
      let usernameList = $(
        ".lobbyItem[uid=" + $(item).attr("uid") + "] .username",
      );
      for (let i = 0; i < usernameList.length; i++) {
        appendMessage(
          [
            {
              text: $(usernameList[i]).text(),
              color: $(usernameList[i]).css("color"),
            },
          ],
          "#playerNames",
        );
        addPlayer($(usernameList[i]).text());
      }
      appendMessage(
        [
          {
            text: "This game has already started, please join a different one."
          },
        ],
        "#chatbox",
        "#950d0d"
      );
    }
  }
}

user.socket.on("canVote", () => {
  user.canVote = true;
});
user.socket.on("cannotVote", () => {
  user.canVote = false;
});

let notificationSound: HTMLAudioElement = new Audio(
  "162464__kastenfrosch__message.mp3",
);
notificationSound.volume = 0.4;
let newPlayerSound: HTMLAudioElement = new Audio(
  "162476__kastenfrosch__gotitem.mp3",
);
newPlayerSound.volume = 0.2;
let lostPlayerSound: HTMLAudioElement = new Audio(
  "162465__kastenfrosch__lostitem.mp3",
);
lostPlayerSound.volume = 0.2;

//BODGE (needs neatening up):
//Safari only permits audio playback if the user has previously interacted with the UI
//Even if this code were to run on other browsers, it should have no effect
$(document).on("click", function() {
  //mute and play all the sound effects once
  notificationSound.muted = true;
  newPlayerSound.muted = true;
  lostPlayerSound.muted = true;

  notificationSound.play();
  newPlayerSound.play();
  lostPlayerSound.play();

  //unmute each sound effect once they have finished playing once
  notificationSound.onended = function() {
    if (notificationSound) {
      notificationSound.muted = false;
      notificationSound.onended = () => {};
    }
  };
  newPlayerSound.onended = function() {
    newPlayerSound.muted = false;
    newPlayerSound.onended = () => {};
  };
  lostPlayerSound.onended = function() {
    lostPlayerSound.muted = false;
    lostPlayerSound.onended = () => {};
  };

  $(document).off("click");
});

function isClientScrolledDown() {
  return (
    Math.abs(
      $("#inner")[0].scrollTop +
        $("#inner")[0].clientHeight -
        $("#inner")[0].scrollHeight,
    ) <= 10
  );
}

function addPlayerToLobbyList(username: string) {
  $("#lobbyList").append("<li>" + username + "</li>");
}

function removePlayerFromLobbyList(username: string) {
  $("#lobbyList li")
    .filter(function() {
      return $(this).text() === username;
    })
    .remove();
}

function appendMessage(
  msg: Array<{
    text: string;
    color?: string;
    backgroundColor?: string;
    italic?: boolean;
  }>,
  target: string,
  backgroundColor?: string,
) {
  //test if client scrolled down
  let scrollDown = isClientScrolledDown();

  //we add a span within an li
  let newMessageLi = $("<li class='gameli'></li>");
  for (let i = 0; i < msg.length; i++) {
    let messageSpan = $("<span></span>");
    $(messageSpan).text(msg[i].text);
    let textColor = "#cecece";
    if (msg[i].color) {
      textColor = msg[i].color as string;
    }
    $(messageSpan).css("color", textColor);
    if (msg[i].backgroundColor) {
      $(messageSpan).css("background-color", msg[i].backgroundColor as string);
    }
    if (msg[i].italic == true) {
      $(messageSpan).css("font-style", "italic");
    }
    $(newMessageLi).append($(messageSpan));
  }
  if (backgroundColor) {
    $(newMessageLi).css("background-color", backgroundColor);
  }
  $(target).append(newMessageLi);
  //only scroll down if the client was scrolled down before the message arrived
  if (scrollDown && target == "#chatbox") {
    $("#inner")[0].scrollTop =
      $("#inner")[0].scrollHeight - $("#inner")[0].clientHeight;
  }
}

function removeMessage(msg: string, target: string) {
  $(target + " li")
    .filter(function() {
      return $(this).text() === msg;
    })
    .remove();
}

function lineThroughPlayer(msg: string, color: string) {
  $("#playerNames li span")
    .filter(function() {
      return $(this).text() === msg;
    })
    .css("color", color);
  $("#playerNames li span")
    .filter(function() {
      return $(this).text() === msg;
    })
    .css("text-decoration", "line-through");
}

let lobbyChatListContainerSimpleBar = new SimpleBar(
  $("#lobbyChatListContainer")[0],
);

$(function() {
  //if navigator is not online, display a message warning that the user has disconnected

  if ($("#lobbyItemList .lobbyItem").length == 0) {
    ReactDOM.render(
      <p
        id="emptyLobbyItemPrompt"
        style={{
          textAlign: "center",
          marginTop: "20px",
          fontStyle: "italic",
          fontSize: "1.1em",
        }}
      >
        Create a new game to play
      </p>,
      $("#lobbyItemList")[0],
    );
  }

  $("#registerBox").focus();
  leaveGameButton.setNotInPlayClick();
  $("#lobbyChatForm").submit(() => {
    console.log("active");
    if ($("#lobbyChatInput").val() != "") {
      user.socket.emit("lobbyMessage", $("#lobbyChatInput").val());
      $("#lobbyChatInput").val("");
    }
    return false;
  });

  user.socket.on("reloadClient", function() {
    console.log("client receipt");
    if (document.hidden) {
      location.reload();
    }
  });

  $("#leaveGameForm").submit(function() {
    user.socket.emit("leaveGame");
  });
  user.socket.on("transitionToLobby", function() {
    transitionFromLandingToLobby();
  });
  user.socket.on("transitionToGame", function(
    name: string,
    uid: string,
    inPlay: boolean,
  ) {
    transitionFromLandingToGame(name, uid, inPlay);
  });
  user.socket.on("message", function(message: Message, textColor: string) {
    appendMessage(message, "#chatbox", textColor);
  });
  user.socket.on("headerTextMessage", function(standardArray: Message) {
    let out = [];
    for (let i = 0; i < standardArray.length; i++) {
      out.push(
        new StandardMainText(standardArray[i].text, standardArray[i].color),
      );
    }
    if (mainText) {
      mainText.push(out);
    }
  });
  user.socket.on("restart", function() {
    user.restart();
  });
  user.socket.on("registered", function(username: string) {
    transitionFromLandingToLobby();
    user.register();
    user.username = username;
    leaveGameButton.setNotInPlayClick();
  });
  user.socket.on("clear", function() {
    $("ul").empty();
  });
  user.socket.on("setTitle", function(title: string) {
    $(document).attr("title", title);
  });
  user.socket.on("notify", function() {
    notificationSound.play();
  });
  user.socket.on("removeGameFromLobby", function(uid: string) {
    $("#container .lobbyItem[uid=" + uid + "]").remove();
    if ($("#lobbyItemList .lobbyItem").length == 0) {
      ReactDOM.render(
        <p
          id="emptyLobbyItemPrompt"
          style={{
            textAlign: "center",
            marginTop: "20px",
            fontStyle: "italic",
            fontSize: "1.1em",
          }}
        >
          Create a new game to play
        </p>,
        $("#lobbyItemList")[0],
      );
    }
  });
  user.socket.on("addNewGameToLobby", function(
    name: string,
    type: string,
    uid: string,
  ) {
    $("#emptyLobbyItemPrompt").css("display", "none");
    let div = document.createElement("div");
    div.className = "lobbyItemReactContainer";
    $("#container .simplebar-content #lobbyItemList").prepend(div);
    ReactDOM.render(
      <LobbyItem name={name} type={type} uid={uid} ranked={false} />,
      $("#container .simplebar-content .lobbyItemReactContainer:first")[0],
    );
    $(".lobbyItem").off("click");
    $(".lobbyItem").click(function() {
      lobbyItemClick(this);
    });
  });
  user.socket.on("newGame", function() {
    user.state = States.INGAMEPLAYING;
  });
  user.socket.on("endChat", function() {
    console.log("active");
    user.state = States.GAMEENDED;
    leaveGameButton.setNotInPlayClick();
  });
  user.socket.on("sound", function(sound: string) {
    if (sound == "NEWGAME") {
      notificationSound.play();
    } else if (sound == "NEWPLAYER") {
      newPlayerSound.play();
    } else if (sound == "LOSTPLAYER") {
      lostPlayerSound.play();
    }
  });
  user.socket.on("registrationError", function(error: string) {
    $(
      '<p style="color:red;font-size:18px;margin-top:15px;">Invalid: ' +
        error +
        "</p>",
    )
      .hide()
      .appendTo("#errors")
      .fadeIn(100);
  });
  $("document").resize(function() {});
  user.socket.on("lobbyMessage", function(msg: Message) {
    appendMessage(msg, "#lobbyChatList");
    if (
      Math.abs(
        lobbyChatListContainerSimpleBar.getScrollElement().scrollTop +
          lobbyChatListContainerSimpleBar.getScrollElement().clientHeight -
          lobbyChatListContainerSimpleBar.getScrollElement().scrollHeight,
      ) <= 50
    ) {
      lobbyChatListContainerSimpleBar.getScrollElement().scrollTop = lobbyChatListContainerSimpleBar.getScrollElement().scrollHeight;
    }
  });
  user.socket.on("rightMessage", function(msg: Message) {
    appendMessage(msg, "#playerNames");
    addPlayer(msg[0].text);
  });
  user.socket.on("leftMessage", function(msg: Message) {
    appendMessage(msg, "#roleNames");
  });
  user.socket.on("removeRight", function(msg: string) {
    removeMessage(msg, "#playerNames");
    removeMessage(" " + msg, "#playerNames");
    console.log("active: " + msg);
    removePlayer(msg);
    removePlayer(" " + msg);
  });
  user.socket.on("removeLeft", function(msg: string) {
    removeMessage(msg, "#roleNames");
  });
  user.socket.on("lineThroughPlayer", function(msg: string, color: string) {
    lineThroughPlayer(msg, color);
    lineThroughPlayer(" " + msg, color);
  });
  user.socket.on("markAsDead", function(msg: string) {
    markAsDead(msg);
    markAsDead(" " + msg);
    lineThroughPlayer(msg, "red");
    lineThroughPlayer(" " + msg, "red");
  });
  window.addEventListener("offline", function(e) {
    console.log("disconnected - show player warning");
    $("#offlineWarning").css("display", "block");
  });
  user.socket.on("setTime", function(time: number, warn: number) {
    if (time > 0) {
      $("#gameClock").text("Time: " + user.convertTime(time));
    }
    $("#gameClock").css("color", "#cecece");
    user.now = Date.now();
    user.time = time;
    user.warn = warn;
  });
  $(".lobbyItem").off("click");
  $(".lobbyItem").click(function() {
    lobbyItemClick(this);
  });
  user.socket.on("getAllRolesForSelection", function(
    rolesArray: Array<{
      color: string;
      name: string;
    }>,
  ) {
    console.log(rolesArray);
    for (let roles of rolesArray) {
      $("#allRolesForGameType").append(
        '<button class="ui ' +
          roles.color +
          ' button">' +
          roles.name +
          "</button>",
      );
    }
  });
  user.socket.on("updateGame", function(
    name: string,
    playerNames: Array<string>,
    playerColors: Array<string>,
    number: number,
    inPlay: boolean,
  ) {
    if (inPlay) {
      $("#container div[uid=" + number.toString() + "] p:first span:last").html(
        "IN PLAY",
      );
      $("#container div[uid=" + number.toString() + "]").attr("inPlay", "true");
    } else {
      $("#container div[uid=" + number.toString() + "] p:first span:last").html(
        "OPEN",
      );
      $("#container div[uid=" + number.toString() + "]").attr(
        "inPlay",
        "false",
      );
    }
    let div = $(
      "#container div[uid=" + number.toString() + "] p:last span:first",
    );
    div.empty();
    for (let i = 0; i < playerNames.length; i++) {
      if (i == 0) {
        div.append(
          '<span class="username" style="color:' +
            playerColors[i] +
            '">' +
            playerNames[i],
        );
      } else {
        div.append("<span>,");
        div.append(
          '<span class="username" style="color:' +
            playerColors[i] +
            '"> ' +
            playerNames[i],
        );
      }
    }
  });
  user.socket.on("addPlayerToLobbyList", function(username: string) {
    addPlayerToLobbyList(username);
  });
  user.socket.on("removePlayerFromLobbyList", function(username: string) {
    removePlayerFromLobbyList(username);
  });
  //removes player from game list
  user.socket.on("removePlayerFromGameList", function(
    name: string,
    game: string,
  ) {
    let spanList = $("#container div[uid=" + game + "] p:last span:first span");
    for (let i = 0; i < spanList.length; i++) {
      if (
        $(spanList[i]).text() == name ||
        $(spanList[i]).text() == " " + name
      ) {
        //remove the separating comma if it exists
        if (i != spanList.length - 1) {
          $(spanList[i + 1]).remove();
        }
        if (i == spanList.length - 1 && i > 0) {
          $(spanList[i - 1]).remove();
        }
        $(spanList[i]).remove();
        break;
      }
    }
  });
  user.socket.on("addPlayerToGameList", function(
    name: string,
    color: string,
    game: string,
  ) {
    let div = $("#container div[uid=" + game + "] p:last span:first");
    let spanList = $("#container div[uid=" + game + "] p:last .username");
    if (spanList.length == 0) {
      div.append('<span class="username" style="color:' + color + '">' + name);
    } else {
      div.append("<span>,");
      div.append('<span class="username" style="color:' + color + '"> ' + name);
    }
  });
  user.socket.on("markGameStatusInLobby", function(
    game: string,
    status: string,
  ) {
    if (status == "OPEN") {
      $("#container div[uid=" + game + "]").attr("inplay", "false");
    } else if (status == "IN PLAY") {
      $("#container div[uid=" + game + "]").attr("inplay", "true");
    }
    $("#container div[uid=" + game + "] p:first span:last").html(status);
    if (status == "OPEN") {
      //clear out the player list as the game has ended
      $("#container div[uid=" + game + "] p:last span:first").empty();
    }
  });
  window.onhashchange = function() {
    if (location.hash == "") {
      location.hash = "2";
    } else if (location.hash == "#3" && user.gameClicked) {
      transitionFromLobbyToGame();
    } else if (location.hash == "#2") {
      if (!user.isState(States.INGAMEWAITING)) {
        user.restart();
      } else {
        transitionFromGameToLobby();
      }
    }
  };

  $("#registerForm").submit(function() {
    if ($("#registerBox").val() != "") {
      $("#errors").empty();
      user.socket.emit("message", $("#registerBox").val());
      $("#registerBox").val("");
    }
  });

  $("#viewLobby").click(() => {
    transitionFromGameToLobby();
  });
});

function transitionFromLandingToLobby() {
  $("#landingPage").fadeOut(200, function() {
    $("#lobbyContainer").fadeIn(200);
    location.hash = "#2";
    //scroll down the lobby chat
    lobbyChatListContainerSimpleBar.getScrollElement().scrollTop = lobbyChatListContainerSimpleBar.getScrollElement().scrollHeight;
  });
}
//only use when the player has created a new tab
//and should connect to the game they were previously in
function transitionFromLandingToGame(
  gameName: string,
  uid: string,
  inGame: boolean,
) {
  console.log(inGame);
  $("#landingPage").fadeOut("fast", function() {
    $("#playerNames").empty();
    $("#playerNames").append("<li class='gameli'>Players:</li>");
    let usernameList = $(".lobbyItem[uid=" + uid + "] .username");
    for (let i = 0; i < usernameList.length; i++) {
      appendMessage(
        [
          {
            text: $(usernameList[i]).text(),
            color: $(usernameList[i]).css("color"),
          },
        ],
        "#playerNames",
      );
      addPlayer($(usernameList[i]).text());
    }
    user.gameClicked = true;
    if (inGame) {
      user.state = States.INGAMEPLAYING;
      user.register();
      $("#topLevel").fadeIn(200);
      if (gameName) {
        $("#mainGameName").text(gameName);
        resize();
      }
      //scroll down the game chatbox
      $("#inner")[0].scrollTop =
        $("#inner")[0].scrollHeight - $("#inner")[0].clientHeight;
      $("#topLevel")[0].scrollTop = 0;
      $("#msg").focus();
    } else {
      user.state = States.INGAMEWAITING;
      user.register();
      $("#topLevel").fadeIn(200);
      if (gameName) {
        $("#mainGameName").text(gameName);
        resize();
      }
      //scroll down the game chatbox
      $("#inner")[0].scrollTop =
        $("#inner")[0].scrollHeight - $("#inner")[0].clientHeight;
      $("#topLevel")[0].scrollTop = 0;
      $("#msg").focus();
    }
  });
}

function transitionFromLobbyToGame(gameName?: string) {
  $("#landingPage").fadeOut("fast", function() {
    $("#lobbyContainer").fadeOut(200, function() {
      $("#topLevel").fadeIn(200);
      resize();
    });
    if (gameName) {
      $("#mainGameName").text(gameName);
    }
    $("#topLevel")[0].scrollTop = 0;
    $("#msg").focus();
  });
}

function transitionFromGameToLobby() {
  $("#landingPage").fadeOut("fast", function() {
    $("#topLevel").fadeOut(200, function() {
      $("#lobbyContainer").fadeIn(200);
      //scroll down the lobby chat
      lobbyChatListContainerSimpleBar.getScrollElement().scrollTop = lobbyChatListContainerSimpleBar.getScrollElement().scrollHeight;
    });
    $("#lobbyContainer")[0].scrollTop = 0;
  });
}

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
import * as WebFont from "webfontloader";
import * as PIXI from "pixi.js";

export let mainText: StandardMainTextList | undefined = undefined;
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
  active: function() {
    mainText = new StandardMainTextList();
  },
});
export class StandardMainText {
  public object: PIXI.Text;
  constructor(text: string, color: string) {
    if (color == undefined) {
      this.object = new PIXI.Text(text, {
        fontFamily: "Mercutio",
        fontSize: 512,
        fill: 0xffffff,
        align: "center",
      });
    } else {
      color = color.substr(1);
      color = "0x" + color;
      this.object = new PIXI.Text(text, {
        fontFamily: "Mercutio",
        fontSize: 512,
        fill: parseInt(color),
        align: "center",
      });
    }
    this.object.scale.x = 0.125;
    this.object.scale.y = 0.125;
  }
}
class StandardMainTextList {
  public container: PIXI.Container;
  public fadeOutTimeout: NodeJS.Timer | undefined = undefined;
  public textShownDuration: number = 2500;
  public queue: Array<Array<StandardMainText>>;
  constructor(textArray?: Array<StandardMainText>) {
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
  push(textArray: Array<StandardMainText>) {
    this.queue.unshift(textArray);
    //if this is the only element in the queue, then render it now
    if (this.queue.length == 1) {
      this.render(this.queue[this.queue.length - 1]);
    }
  }
  render(textArray: Array<StandardMainText>) {
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
const playerTexture = PIXI.Texture.fromImage(
  "assets/swordplayerbreathing/sprite_0.png",
);
const playerTexture2 = PIXI.Texture.fromImage(
  "assets/swordplayerbreathing/sprite_1.png",
);
const playerTextureSelected = PIXI.Texture.fromImage(
  "assets/swordplayerbreathing/sprite_0_selected.png",
);
const playerTextureSelected2 = PIXI.Texture.fromImage(
  "assets/swordplayerbreathing/sprite_1_selected.png",
);
const graveTexture = PIXI.Texture.fromImage("assets/grave.png");
let players: Array<Player> = [];
const stoneBlockTexture = PIXI.Texture.fromImage("assets/stoneblock.png");
const stoneBlockContainer = new PIXI.Container();
app.stage.addChild(stoneBlockContainer);
class StoneBlock {
  public sprite: PIXI.Sprite = new PIXI.Sprite(stoneBlockTexture);
  constructor(x: number, y: number) {
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
  } else {
    for (let x = y - 11; x < 11 - y; x++) {
      let stoneblock = new StoneBlock(x * 64, y * 64);
    }
  }
}
stoneBlockContainer.pivot.y = stoneBlockContainer.height / 2;
app.stage.interactive = true;
app.stage.on("pointerdown", () => {
  if (user.inGame) {
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
        user.socket.emit("message", "/unvote");
      }
    }
  }
});
user.socket.on("cancelVoteEffect", function() {
  cancelVote();
});
user.socket.on("selectPlayer", function(username: string) {
  selectPlayer(username.trim());
});
user.socket.on("finalVerdict", function() {
  $("#guiltyButtons").show();
});
user.socket.on("endVerdict", function() {
  $("#guiltyButtons").hide();
});
$("#guiltyButton").on("click", function() {
  user.socket.emit("message", "/guilty");
});
$("#innocentButton").on("click", function() {
  user.socket.emit("message", "/innocent");
});
function cancelVote() {
  for (let i = 0; i < players.length; i++) {
    players[i].votedFor = false;
  }
}
let firstTimeSelectingPlayer = true;
let firstTimeSelectingInterval: NodeJS.Timer | undefined = undefined;
let firstTimeNumberOfRuns = 0;
export function markAsDead(username: string) {
  for (let i = 0; i < players.length; i++) {
    if (players[i].username == username) {
      players[i].disappear();
    }
  }
}
function selectPlayer(username: string) {
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
  public sprite: PIXI.Sprite;
  public usernameText: PIXI.Text;
  public graveSprite: PIXI.Sprite;
  public selected: boolean;
  public votedFor: boolean;
  public breatheAnimation: number | undefined;
  public frameCount: number;
  constructor(public username: string) {
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
      } else {
        this.sprite.texture = playerTextureSelected2;
      }
    });
    this.sprite.on("pointerout", () => {
      this.selected = false;
      if (this.sprite.texture == playerTextureSelected && !this.votedFor) {
        this.sprite.texture = playerTexture;
      } else if (!this.votedFor) {
        this.sprite.texture = playerTexture2;
      }
    });
    this.sprite.on("pointerdown", () => {
      if (user.inGame && user.canVote && !this.votedFor) {
        user.socket.emit("message", "/vote " + username.trim());
        for (let i = 0; i < players.length; i++) {
          players[i].votedFor = false;
          if (players[i] != this) {
            if ((players[i].sprite.texture = playerTextureSelected)) {
              players[i].sprite.texture = playerTexture;
            } else {
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
      //stroke: "#000000",
      //strokeThickness: 20,
    });
    this.usernameText.scale.x = 0.25;
    this.usernameText.scale.y = 0.25;
    this.usernameText.x = Math.floor(this.sprite.x);
    this.usernameText.y = Math.floor(this.sprite.y - 45);
    this.usernameText.anchor.set(0.5, 0.5);
    app.stage.addChild(this.usernameText);
    this.breatheAnimation = window.setInterval(this.breathe.bind(this), 1500);
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
  setPos(x: number, y: number) {
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
    } else {
      this.sprite.texture = playerTextureSelected2;
    }
  }
}
let gallowsTexture = PIXI.Texture.fromImage("assets/gallows.png");
let gallowsHangingAnimation: Array<PIXI.Texture> = [];
gallowsHangingAnimation.push(
  PIXI.Texture.fromImage("assets/swordplayerhanging/sprite_hanging0.png"),
);
gallowsHangingAnimation.push(
  PIXI.Texture.fromImage("assets/swordplayerhanging/sprite_hanging1.png"),
);
gallowsHangingAnimation.push(
  PIXI.Texture.fromImage("assets/swordplayerhanging/sprite_hanging2.png"),
);
gallowsHangingAnimation.push(
  PIXI.Texture.fromImage("assets/swordplayerhanging/sprite_hanging3.png"),
);
class Gallows {
  public sprite: PIXI.Sprite;
  public counter: number = 0;
  public hangingInterval: NodeJS.Timer | undefined = undefined;
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
export let gallows = new Gallows();
user.socket.on("hang", function(usernames: Array<string>) {
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
  gallows.hang();
});
user.socket.on("resetGallows", function() {
  gallows.reset();
});
export function removeAllPlayers() {
  for (let i = 0; i < players.length; i++) {
    players[i].destructor();
  }
  players = [];
  resize();
}
export function removePlayer(username: string) {
  for (let i = 0; i < players.length; i++) {
    if (players[i].username == username) {
      players[i].destructor();
      players.splice(i, 1);
      resize();
    }
  }
}
export function addPlayer(username: string) {
  const newPlayer = new Player(username);
  if (mainText) {
    app.stage.removeChild(mainText.container);
    app.stage.addChild(mainText.container);
  }
  resize();
}
export function resize() {
  const parent = app.view.parentNode;
  app.renderer.resize(
    (parent as Element).clientWidth,
    (parent as Element).clientHeight,
  );
  if (mainText) {
    mainText.reposition();
  }
  gallows.sprite.x = Math.floor(app.renderer.width / 2);
  gallows.sprite.y = Math.floor(app.renderer.height / 2) - 10;
  let positions: Array<Array<number>> = [];
  if (players.length <= 10) {
    positions = distributeInCircle(players.length, 190);
  } else {
    positions = distributeInCircle(players.length, 210);
  }
  for (let i = 0; i < players.length; i++) {
    players[i].setPos(
      gallows.sprite.x + positions[i][0],
      gallows.sprite.y + positions[i][1] + 20,
    );
    if (positions[i][0] > 1) {
      players[i].sprite.scale.x = -1;
    } else {
      players[i].sprite.scale.x = 1;
    }
  }
  stoneBlockContainer.position.x = gallows.sprite.position.x + 33;
  stoneBlockContainer.position.y = gallows.sprite.position.y - 33;
}
function distributeInCircle(number: number, radius: number) {
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
app.stage.addChild(gallows.sprite);
$("#canvasContainer").append(app.view);
