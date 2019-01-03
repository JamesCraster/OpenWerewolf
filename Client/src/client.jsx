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

class States {
  static get NOTASSIGNEDGAME() {
    return "NOT ASSIGNED GAME";
  }
  static get INGAMEWAITING() {
    return "IN GAME WAITING";
  }
  static get INGAMEPLAYING() {
    return "IN GAME PLAYING";
  }
  static get GAMEENDED() {
    return "GAME ENDED";
  }
}
class LeaveGameButton {
  constructor() {
    this.action = this.inPlayClick;
  }
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

class User {
  constructor() {
    this._state = States.NOTASSIGNEDGAME;
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
  isState(state) {
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
  convertTime(duration) {
    let seconds = parseInt((duration / 1000) % 60);
    let minutes = parseInt((duration / (1000 * 60)) % 60);
    minutes = minutes < 10 ? "0" + minutes : minutes;
    seconds = seconds < 10 ? "0" + seconds : seconds;
    return minutes + ":" + seconds;
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

function lobbyItemClick(item) {
  user.gameClicked = true;
  if (user.isState(States.NOTASSIGNEDGAME)) {
    transitionFromLobbyToGame($(item).attr("name"));
  } else {
    transitionFromLobbyToGame();
  }
  location.hash = 3;
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
        addPlayer($(usernameList[i]).text(), "#FFFFFF");
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
        addPlayer($(usernameList[i]).text(), "#FFFFFF");
      }
      appendMessage(
        [
          {
            text: "This game has already started, please join a different one.",
            backgroundColor: "#950d0d",
          },
        ],
        "#chatbox",
      );
    }
  }
}

let user = new User();

user.socket.on("canVote", () => {
  user.canVote = true;
});
user.socket.on("cannotVote", () => {
  user.canVote = false;
});

let notificationSound = new Audio("162464__kastenfrosch__message.mp3");
notificationSound.volume = 0.4;
let newPlayerSound = new Audio("162476__kastenfrosch__gotitem.mp3");
newPlayerSound.volume = 0.2;
let lostPlayerSound = new Audio("162465__kastenfrosch__lostitem.mp3");
lostPlayerSound.volume = 0.2;

//BODGE (needs neatening up):
//Safari only permits audio playback if the user has previously interacted with the UI
//Even if this code were to run on other browsers, it should have no effect
//Test for safari:
if (window.safari !== undefined) {
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
      notificationSound.muted = false;
      notificationSound.onended = undefined;
    };
    newPlayerSound.onended = function() {
      newPlayerSound.muted = false;
      newPlayerSound.onended = undefined;
    };
    lostPlayerSound.onended = function() {
      lostPlayerSound.muted = false;
      lostPlayerSound.onended = undefined;
    };

    $(document).off("click");
  });
}

function isClientScrolledDown() {
  return (
    Math.abs(
      $("#inner")[0].scrollTop +
        $("#inner")[0].clientHeight -
        $("#inner")[0].scrollHeight,
    ) <= 10
  );
}

function addPlayerToLobbyList(username) {
  $("#lobbyList").append("<li>" + username + "</li>");
}

function removePlayerFromLobbyList(username) {
  $("#lobbyList li")
    .filter(function() {
      return $(this).text() === username;
    })
    .remove();
}

function appendMessage(msg, target, backgroundColor) {
  //test if client scrolled down
  let scrollDown = isClientScrolledDown();

  //we add a span within an li
  let newMessageLi = $("<li class='gameli'></li>");
  if (backgroundColor) {
    $(newMessageLi).css("background-color", backgroundColor);
  }
  for (let i = 0; i < msg.length; i++) {
    let messageSpan = $("<span></span>");
    $(messageSpan).text(msg[i].text);
    let textColor = "#cecece";
    if (msg[i].color) {
      textColor = msg[i].color;
    }
    $(messageSpan).css("color", textColor);
    if (msg[i].backgroundColor) {
      $(messageSpan).css("background-color", msg[i].backgroundColor);
    }
    if (msg[i].italic == true) {
      $(messageSpan).css("font-style", "italic");
    }
    $(newMessageLi).append($(messageSpan));
  }
  $(target).append(newMessageLi);

  //only scroll down if the client was scrolled down before the message arrived
  if (scrollDown && target == "#chatbox") {
    $("#inner")[0].scrollTop =
      $("#inner")[0].scrollHeight - $("#inner")[0].clientHeight;
  }
}

function removeMessage(msg, target) {
  $(target + " li")
    .filter(function() {
      return $(this).text() === msg;
    })
    .remove();
}

function lineThroughPlayer(msg, color) {
  console.log($("#playerNames li span"));
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
    user.socket.emit("lobbyMessage", $("#lobbyChatInput").val());
    $("#lobbyChatInput").val("");
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
  user.socket.on("transitionToGame", function(name, uid, inPlay) {
    transitionFromLandingToGame(name, uid, inPlay);
  });
  user.socket.on("message", function(message, textColor) {
    console.log(message);
    appendMessage(message, "#chatbox", textColor);
  });
  user.socket.on("headerTextMessage", function(standardArray) {
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
  user.socket.on("registered", function(username) {
    transitionFromLandingToLobby();
    user.register();
    user.username = username;
    leaveGameButton.setNotInPlayClick();
  });
  user.socket.on("clear", function() {
    $("ul").clear();
  });
  user.socket.on("setTitle", function(title) {
    $(document).attr("title", title);
  });
  user.socket.on("notify", function() {
    notificationSound.play();
  });
  user.socket.on("removeGameFromLobby", function(uid) {
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
  user.socket.on("addNewGameToLobby", function(name, type, uid) {
    $("#emptyLobbyItemPrompt").css("display", "none");
    let div = document.createElement("div");
    div.className = "lobbyItemReactContainer";
    $("#container .simplebar-content #lobbyItemList").prepend(div);
    ReactDOM.render(
      <LobbyItem name={name} type={type} uid={uid} ranked="false" />,
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
  user.socket.on("sound", function(sound) {
    if (sound == "NEWGAME") {
      notificationSound.play();
    } else if (sound == "NEWPLAYER") {
      newPlayerSound.play();
    } else if (sound == "LOSTPLAYER") {
      lostPlayerSound.play();
    }
  });
  user.socket.on("registrationError", function(error) {
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
  user.socket.on("lobbyMessage", function(msg) {
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
  user.socket.on("rightMessage", function(msg) {
    appendMessage(msg, "#playerNames");
    addPlayer(msg[0].text, "#FFFFFF");
  });
  user.socket.on("leftMessage", function(msg) {
    appendMessage(msg, "#roleNames");
  });
  user.socket.on("removeRight", function(msg) {
    removeMessage(msg, "#playerNames");
    removeMessage(" " + msg, "#playerNames");
    console.log("active: " + msg);
    removePlayer(msg);
    removePlayer(" " + msg);
  });
  user.socket.on("removeLeft", function(msg) {
    removeMessage(msg, "#roleNames");
  });
  user.socket.on("lineThroughPlayer", function(msg, color) {
    console.log(msg);
    console.log(color);
    lineThroughPlayer(msg, color);
    lineThroughPlayer(" " + msg, color);
  });
  user.socket.on("markAsDead", function(msg) {
    console.log(msg);
    markAsDead(msg);
    markAsDead(" " + msg);
  });
  window.addEventListener("offline", function(e) {
    console.log("disconnected - show player warning");
    $("#offlineWarning").css("display", "block");
  });
  user.socket.on("setTime", function(time, warn) {
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
  user.socket.on("getAllRolesForSelection", function(rolesArray){
    console.log(rolesArray)
    for(let roles of rolesArray){
      
      $('#allRolesForGameType').append('<button class="ui ' + roles.color + ' button">' + roles.name + '</button>')
    }
  });
  user.socket.on("updateGame", function(
    name,
    playerNames,
    playerColors,
    number,
    inPlay,
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
  user.socket.on("addPlayerToLobbyList", function(username) {
    addPlayerToLobbyList(username);
  });
  user.socket.on("removePlayerFromLobbyList", function(username) {
    removePlayerFromLobbyList(username);
  });
  //removes player from game list
  user.socket.on("removePlayerFromGameList", function(name, game) {
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
  user.socket.on("addPlayerToGameList", function(name, color, game) {
    let div = $("#container div[uid=" + game + "] p:last span:first");
    let spanList = $("#container div[uid=" + game + "] p:last .username");
    if (spanList.length == 0) {
      div.append('<span class="username" style="color:' + color + '">' + name);
    } else {
      div.append("<span>,");
      div.append('<span class="username" style="color:' + color + '"> ' + name);
    }
  });
  user.socket.on("markGameStatusInLobby", function(game, status) {
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
      this.location.hash = 2;
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
function transitionFromLandingToGame(gameName, uid, inGame) {
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
      addPlayer($(usernameList[i]).text(), "#FFFFFF");
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

function transitionFromLobbyToGame(gameName) {
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
