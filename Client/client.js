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
    $('#leaveGame').off('click');
    this.action = function () {
      $('#leaveGameModal').modal('show');
    };
    $('#leaveGame').click(this.action);
  }
  setNotInPlayClick() {
    $('#leaveGame').off('click');
    this.action = function () {
      console.log(user.inGame);
      if (!user.inGame) {
        transitionFromGameToLobby();
        user.socket.emit('leaveGame');
        user.restart();
      }
    };
    $('#leaveGame').click(this.action);
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
    $('#playerNames').empty();
    $('#playerNames').append('<li class="gameli">Players:</li>');
    $('#roleNames').empty();
    $('#gameClock').text('Time: 00:00');
    $('#gameClock').css("color", "#cecece");
    $('#roleNames').append('<li class="gameli">Roles:</li>');
    $('#chatbox').empty();
    $('#leaveGame').off('click');
    leaveGameButton.setNotInPlayClick();
  }
  convertTime(duration) {
    let seconds = parseInt(duration / 1000 % 60);
    let minutes = parseInt(duration / (1000 * 60) % 60);
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
        $('#gameClock').css("color", "#cecece");
        this.warn = -1;
      }
      $('#gameClock').text("Time: " + this.convertTime(user.time));
      if (this.time <= this.warn && this.time >= 0) {
        $('#gameClock').css("color", "#ff1b1b");
      }
    } else {
      $('#gameClock').text("Time: " + this.convertTime(0));
    }
  }
  register() {
    this.registered = true;
  }
}

function lobbyItemClick(item) {
  user.gameClicked = true;
  if (user.isState(States.NOTASSIGNEDGAME)) {
    transitionFromLobbyToGame($(item).attr('name'));
  } else {
    transitionFromLobbyToGame();
  }
  location.hash = 3;
  if ($(item).attr('inPlay') == "false") {
    if (user.isState(States.NOTASSIGNEDGAME)) {
      $('#chatbox').empty();
      $('#playerNames').empty();
      removeAllPlayers();
      $('#playerNames').append("<li class='gameli'>Players:</li>");
      let usernameList = $(".lobbyItem[uid=" + $(item).attr('uid') + "] .username");
      for (let i = 0; i < usernameList.length; i++) {
        appendMessage($(usernameList[i]).text(), "#playerNames", $(usernameList[i]).css('color'));
        addPlayer($(usernameList[i]).text(), '#FFFFFF');
      }
      user.socket.emit("gameClick", $(item).attr('uid'));
      user.state = States.INGAMEWAITING;
    }
  } else {
    if (user.isState(States.NOTASSIGNEDGAME)) {
      $('#playerNames').empty();
      removeAllPlayers();
      $('#playerNames').append("<li class='gameli'>Players:</li>");
      let usernameList = $(".lobbyItem[uid=" + $(item).attr('uid') + "] .username");
      for (let i = 0; i < usernameList.length; i++) {
        appendMessage($(usernameList[i]).text(), "#playerNames", $(usernameList[i]).css('color'));
        addPlayer($(usernameList[i]).text(), '#FFFFFF');
      }
      appendMessage("This game has already started, please join a different one.", '#chatbox', undefined, "#950d0d");
    }
  }
}

let user = new User();

user.socket.on('canVote', () => {
  user.canVote = true;
});
user.socket.on('cannotVote', () => {
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
  $(document).on('click', function () {

    //mute and play all the sound effects once
    notificationSound.muted = true;
    newPlayerSound.muted = true;
    lostPlayerSound.muted = true;

    notificationSound.play();
    newPlayerSound.play();
    lostPlayerSound.play();

    //unmute each sound effect once they have finished playing once
    notificationSound.onended = function () {
      notificationSound.muted = false;
      notificationSound.onended = undefined;
    };
    newPlayerSound.onended = function () {
      newPlayerSound.muted = false;
      newPlayerSound.onended = undefined;
    };
    lostPlayerSound.onended = function () {
      lostPlayerSound.muted = false;
      lostPlayerSound.onended = undefined;
    };

    $(document).off('click');
  });
}

function isClientScrolledDown() {
  return Math.abs($("#inner")[0].scrollTop + $('#inner')[0].clientHeight - $("#inner")[0].scrollHeight) <= 10;
}

function addPlayerToLobbyList(username) {
  $('#lobbyList').append('<li>' + username + '</li>');
}

function removePlayerFromLobbyList(username) {
  $('#lobbyList li').filter(function () {
    return $(this).text() === username;
  }).remove();
}

function appendMessage(msg, target, textColor, backgroundColor, usernameColor) {
  //test if client scrolled down
  let scrollDown = isClientScrolledDown();
  if (textColor && backgroundColor) {
    $(target).append($("<li class='gameli' style='color:" + textColor + ";background-color:" + backgroundColor + "'>"));
  } else if (textColor) {
    $(target).append($("<li class='gameli' style='color:" + textColor + "'>"));
  } else if (backgroundColor) {
    $(target).append($("<li class='gameli' style='background-color:" + backgroundColor + "'>"));
  } else {
    $(target).append($("<li class='gameli'>"));
  }
  if (usernameColor) {
    let username = msg.split(":")[0];
    let messageBody = ":" + msg.split(":")[1];
    $(target + " li:last").append($("<span style='color:" + usernameColor + "'>"));
    $(target + " li:last span").text(username);
    $(target + " li:last").append($("<span>"));
    $(target + " li:last span:last").text(messageBody);
  } else {
    $(target + " li:last").text(msg);
  }

  //only scroll down if the client was scrolled down before the message arrived
  if (scrollDown && target == "#chatbox") {
    $("#inner")[0].scrollTop = $("#inner")[0].scrollHeight - $('#inner')[0].clientHeight;
  }
}

function removeMessage(msg, target) {
  $(target + " li").filter(function () {
    return $(this).text() === msg;
  }).remove();
}

function lineThroughPlayer(msg, color) {
  $("#playerNames li").filter(function () {
    return $(this).text() === msg;
  }).css("color", color);
  $("#playerNames li").filter(function () {
    return $(this).text() === msg;
  }).css("text-decoration", "line-through");
}

let lobbyChatListContainerSimpleBar = new SimpleBar($('#lobbyChatListContainer')[0]);

$(function () {
  //filtering lobby entries
  $('#filterAll').click(function () {
    if ($('.lobbyItem:visible').length == 0) {
      $('.lobbyItem').fadeIn('fast');
    } else {
      $('.lobbyItem:visible').fadeOut('fast', function () {
        $('.lobbyItem').fadeIn('fast');
      });
    }
  });
  $('#filterOneDay').click(function () {
    if ($('.lobbyItem:visible').length == 0) {
      $('.lobbyItem').fadeIn('fast');
    } else {
      $(".lobbyItem:visible").fadeOut('fast', function () {
        $(".lobbyItem[type='OneDay']").fadeIn('fast');
      });
    }
  });
  $('#filterClassic').click(function () {
    if ($('.lobbyItem:visible').length == 0) {
      $('.lobbyItem').fadeIn('fast');
    } else {
      $(".lobbyItem:visible").fadeOut('fast', function () {
        $(".lobbyItem[type='Classic']").fadeIn('fast');
      });
    }
  });
  if ($('#lobbyItemList .lobbyItem').length == 0) {
    ReactDOM.render(React.createElement(
      "p",
      { id: "emptyLobbyItemPrompt", style: { textAlign: 'center', marginTop: '20px', fontStyle: 'italic', fontSize: '1.1em' } },
      "Create a new game to play"
    ), $('#lobbyItemList')[0]);
  }
  $('#registerBox').focus();
  leaveGameButton.setNotInPlayClick();
  $('#lobbyChatForm').submit(() => {
    console.log('active');
    user.socket.emit('lobbyMessage', $('#lobbyChatInput').val());
    $('#lobbyChatInput').val('');
    return false;
  });

  //make ranked and private modes mutually exclusive
  $('#newGameFormRanked').parent().checkbox({ onChecked: function () {
      $('#newGameFormPrivate').parent().checkbox('set unchecked');
    } });
  $('#newGameFormPrivate').parent().checkbox({
    onChecked: function () {
      $('#newGameFormRanked').parent().checkbox('set unchecked');
    }
  });

  $('#newGameForm').form({
    fields: {
      gameName: {
        identifier: 'gameName',
        rules: [{
          type: 'empty',
          prompt: 'Please enter a name for your game'
        }]
      }
    }
  });
  let newGameFormOngoing = false;
  $('#newGameForm').submit(() => {
    if (!$('#newGameForm').form('is valid')) {
      return false;
    }
    if (newGameFormOngoing) {
      return false;
    }
    $('#newGameModalCreateButton').addClass('disabled');
    $('#addNewGameAdditionalError').text('');
    $('#newGameForm').addClass('loading');
    newGameFormOngoing = true;
    $.ajax({
      type: 'POST',
      url: '/newGame',
      data: JSON.stringify({
        "name": $("#newGameFormName").val(),
        "type": $('#newGameForm input[name=type]:checked').val()
      }),
      dataType: 'json',
      contentType: 'application/json',
      success: function (data) {
        console.log(data.result);
        if (data.result == "success") {
          //prevent multiple submissions
          $('#newGameModal').modal('hide', function () {
            $('#newGameModalCreateButton').removeClass('disabled');
            newGameFormOngoing = false;
            $('#newGameForm').removeClass('loading');
          });
          $('#newGameForm').form('reset');
          $('#addNewGameAdditionalError').text('');
        } else {
          $('#newGameModalCreateButton').removeClass('disabled');
          $('#addNewGameAdditionalError').text(data.result);
          $('#newGameFormName').val('');
          newGameFormOngoing = false;
          $('#newGameForm').removeClass('loading');
        }
      },
      error: function (error) {
        newGameFormOngoing = false;
        console.log("There has been an error");
        console.log(error);
      }
    });

    return false;
  });

  $('#loginForm').form({
    fields: {
      username: {
        identifier: 'username',
        rules: [{
          type: 'empty',
          prompt: 'Please enter your username'
        }]
      },
      password: {
        identifier: 'password',
        rules: [{
          type: 'empty',
          prompt: 'Please enter your password'
        }]
      }
    }
  });

  //create a new form rule to recongnize when the repeated password doesn't match the password
  $.fn.form.settings.rules.repeatMatchInitial = function () {
    return $('#addNewUserRepeatPassword').val() == $('#addNewUserPassword').val();
  };

  $('#addNewUserForm').form({
    fields: {
      username: {
        identifier: 'username',
        rules: [{
          type: 'empty',
          prompt: 'Please enter your username'
        }]
      },
      email: {
        identifier: 'email',
        rules: [{
          type: 'email',
          prompt: 'Your email is invalid'
        }]
      },
      password: {
        identifier: 'password',
        rules: [{
          type: 'empty',
          prompt: 'Please enter your password'
        }]
      },
      repeatPassword: {
        identifier: 'repeatPassword',
        rules: [{
          type: 'repeatMatchInitial',
          prompt: 'Your password and repeated password don\'t match'
        }]
      }
    }
  });

  $('#addNewUserForm').submit(() => {
    if (!$('#addNewUserForm').form('is valid')) {
      return false;
    }
    console.log('submitted!');
    $('#addNewUserDimmer').dimmer('show');
    $('#addNewUserAdditionalError').text('');
    $.ajax({
      type: 'POST',
      url: '/register',
      data: JSON.stringify({
        "username": $('#addNewUserUsername').val(),
        "email": $('#addNewUserEmail').val(),
        "password": $('#addNewUserPassword').val(),
        "repeatPassword": $("#addNewUserRepeatPassword").val()
      }),
      dataType: 'json',
      contentType: 'application/json',
      success: function (data) {
        console.log(data);
        //if result is not success, the input was not valid
        if (data.result == "success") {
          user.socket.emit('reloadClient');
          location.reload();
        } else {
          $('#addNewUserDimmer').dimmer('hide');
          $('#addNewUserUsername').val('');
          $('#addNewUserAdditionalError').text(data.result);
        }
      },
      error: function (error) {
        console.log("There has been an error");
        console.log(error);
      }
    });
    return false;
  });
  $('#loginForm').submit(() => {
    if (!$('#loginForm').form('is valid')) {
      return false;
    }
    $('#loginDimmer').dimmer('show');
    $.ajax({
      type: 'POST',
      url: '/login',
      data: JSON.stringify({
        "username": $('#loginUsername').val(),
        "password": $('#loginPassword').val()
      }),
      dataType: 'json',
      contentType: 'application/json',
      success: function (data) {
        if (data.result == "success") {
          user.socket.emit('reloadClient');
          location.reload();
        } else {
          console.log('fail received');
          $('#loginModalAdditionalError').text(data.result);
          $('#loginDimmer').dimmer('hide');
        }
      },
      error: function (error) {
        console.log("There has been an error");
        console.log(error);
      }
    });
    return false;
  });
  $('.logoutButton').click(() => {
    $.ajax({
      type: 'POST',
      url: '/logout',
      data: "{}",
      dataType: 'json',
      contentType: 'application/json',
      success: function (data) {
        user.socket.emit('reloadClient');
        location.reload();
      }
    });
  });
  $(".messageForm").submit(function () {
    //prevent submitting empty messages
    if ($("#msg").val() == "") {
      return false;
    }
    user.socket.emit("message", $("#msg").val());
    $("#msg").val("");
    return false;
  });

  $('#leaveGameForm').form({
    fields: {
      confirmation: {
        identifier: 'confirmation',
        rules: [{
          type: 'checked',
          prompt: 'You must confirm by ticking the box'
        }]
      }
    }
  });

  user.socket.on("reloadClient", function () {
    console.log('client receipt');
    if (document.hidden) {
      location.reload();
    }
  });

  $('#leaveGameForm').submit(function () {
    user.socket.emit('leaveGame');
  });
  user.socket.on("transitionToLobby", function () {
    transitionFromLandingToLobby();
  });
  user.socket.on("transitionToGame", function (name, uid, inPlay) {
    transitionFromLandingToGame(name, uid, inPlay);
  });
  user.socket.on("message", function (msg, textColor, backgroundColor, usernameColor) {
    appendMessage(msg, "#chatbox", textColor, backgroundColor, usernameColor);
  });
  user.socket.on("headerTextMessage", function (standardArray) {
    let out = [];
    for (let i = 0; i < standardArray.length; i++) {
      console.log(standardArray[i].color);
      out.push(new StandardMainText(standardArray[i].text, standardArray[i].color));
    }
    if (mainText) {
      mainText.clear();
      mainText.create(out);
      mainText.fadeOut(2500);
    }
  });
  user.socket.on("restart", function () {
    user.restart();
  });
  user.socket.on("registered", function (username) {
    transitionFromLandingToLobby();
    user.register();
    user.username = username;
    leaveGameButton.setNotInPlayClick();
  });
  user.socket.on("clear", function () {
    $('ul').clear();
  });
  user.socket.on("setTitle", function (title) {
    $(document).attr('title', title);
  });
  user.socket.on("notify", function () {
    notificationSound.play();
  });
  user.socket.on('removeGameFromLobby', function (uid) {
    $('#container .lobbyItem[uid=' + uid + ']').remove();
    if ($('#lobbyItemList .lobbyItem').length == 0) {
      ReactDOM.render(React.createElement(
        "p",
        { id: "emptyLobbyItemPrompt", style: { textAlign: 'center', marginTop: '20px', fontStyle: 'italic', fontSize: '1.1em' } },
        "Create a new game to play"
      ), $('#lobbyItemList')[0]);
    }
  });
  user.socket.on("addNewGameToLobby", function (name, type, uid) {
    $('#emptyLobbyItemPrompt').css('display', 'none');
    let div = document.createElement('div');
    div.className = "lobbyItemReactContainer";
    $('#container .simplebar-content #lobbyItemList').prepend(div);
    ReactDOM.render(React.createElement(LobbyItem, { name: name, type: type, uid: uid, ranked: "false" }), $('#container .simplebar-content .lobbyItemReactContainer:first')[0]);
    $('.lobbyItem').off('click');
    $('.lobbyItem').click(function () {
      lobbyItemClick(this);
    });
  });
  user.socket.on("newGame", function () {
    user.state = States.INGAMEPLAYING;
  });
  user.socket.on("endChat", function () {
    console.log('active');
    user.state = States.GAMEENDED;
    leaveGameButton.setNotInPlayClick();
  });
  user.socket.on("sound", function (sound) {
    if (sound == "NEWGAME") {
      notificationSound.play();
    } else if (sound == "NEWPLAYER") {
      newPlayerSound.play();
    } else if (sound == "LOSTPLAYER") {
      lostPlayerSound.play();
    }
  });
  user.socket.on("registrationError", function (error) {
    $('<p style="color:red;font-size:18px;margin-top:15px;">Invalid: ' + error + '</p>').hide().appendTo('#errors').fadeIn(100);
  });
  $('document').resize(function () {});
  user.socket.on("lobbyMessage", function (msg, textColor, backgroundColor) {
    appendMessage(msg, "#lobbyChatList", textColor, undefined, '#cecece');
    if (Math.abs(lobbyChatListContainerSimpleBar.getScrollElement().scrollTop + lobbyChatListContainerSimpleBar.getScrollElement().clientHeight - lobbyChatListContainerSimpleBar.getScrollElement().scrollHeight) <= 50) {
      lobbyChatListContainerSimpleBar.getScrollElement().scrollTop = lobbyChatListContainerSimpleBar.getScrollElement().scrollHeight;
    }
  });
  user.socket.on("rightMessage", function (msg, textColor, backgroundColor) {
    appendMessage(msg, "#playerNames", textColor, backgroundColor);
    addPlayer(msg, '#FFFFFF');
  });
  user.socket.on("leftMessage", function (msg, textColor, backgroundColor) {
    appendMessage(msg, "#roleNames", textColor, backgroundColor);
  });
  user.socket.on("removeRight", function (msg) {
    removeMessage(msg, "#playerNames");
    removeMessage(" " + msg, '#playerNames');
    console.log("active: " + msg);
    removePlayer(msg);
    removePlayer(" " + msg);
  });
  user.socket.on("removeLeft", function (msg) {
    removeMessage(msg, "#roleNames");
  });
  user.socket.on("lineThroughPlayer", function (msg, color) {
    lineThroughPlayer(msg, color);
    lineThroughPlayer(" " + msg, color);
  });
  user.socket.on("markAsDead", function (msg) {
    markAsDead(msg);
    markAsDead(" " + msg);
  });
  user.socket.on("reconnect", function () {
    console.log("disconnected and then reconnected");
  });
  user.socket.on("setTime", function (time, warn) {
    if (time > 0) {
      $('#gameClock').text("Time: " + user.convertTime(time));
    }
    $('#gameClock').css("color", "#cecece");
    user.now = Date.now();
    user.time = time;
    user.warn = warn;
  });
  $('.lobbyItem').off('click');
  $('.lobbyItem').click(function () {
    lobbyItemClick(this);
  });

  user.socket.on("updateGame", function (name, playerNames, playerColors, number, inPlay) {
    if (inPlay) {
      $('#container div[uid=' + number.toString() + '] p:first span:last').html("IN PLAY");
      $('#container div[uid=' + number.toString() + ']').attr('inPlay', "true");
    } else {
      $('#container div[uid=' + number.toString() + '] p:first span:last').html("OPEN");
      $('#container div[uid=' + number.toString() + ']').attr('inPlay', "false");
    }
    let div = $('#container div[uid=' + number.toString() + '] p:last span:first');
    div.empty();
    for (let i = 0; i < playerNames.length; i++) {
      if (i == 0) {
        div.append('<span class="username" style="color:' + playerColors[i] + '">' + playerNames[i]);
      } else {
        div.append('<span>,');
        div.append('<span class="username" style="color:' + playerColors[i] + '"> ' + playerNames[i]);
      }
    }
  });
  user.socket.on('addPlayerToLobbyList', function (username) {
    addPlayerToLobbyList(username);
  });
  user.socket.on('removePlayerFromLobbyList', function (username) {
    removePlayerFromLobbyList(username);
  });
  //removes player from game list
  user.socket.on("removePlayerFromGameList", function (name, game) {
    let spanList = $('#container div[uid=' + game + '] p:last span:first span');
    for (let i = 0; i < spanList.length; i++) {
      if ($(spanList[i]).text() == name || $(spanList[i]).text() == " " + name) {
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
  user.socket.on("addPlayerToGameList", function (name, color, game) {
    let div = $('#container div[uid=' + game + '] p:last span:first');
    let spanList = $('#container div[uid=' + game + '] p:last .username');
    if (spanList.length == 0) {
      div.append('<span class="username" style="color:' + color + '">' + name);
    } else {
      div.append('<span>,');
      div.append('<span class="username" style="color:' + color + '"> ' + name);
    }
  });
  user.socket.on("markGameStatusInLobby", function (game, status) {
    if (status == "OPEN") {
      $('#container div[uid=' + game + ']').attr('inplay', 'false');
    } else if (status == "IN PLAY") {
      $('#container div[uid=' + game + ']').attr('inplay', 'true');
    }
    $('#container div[uid=' + game + '] p:first span:last').html(status);
    if (status == "OPEN") {
      //clear out the player list as the game has ended
      $('#container div[uid=' + game + '] p:last span:first').empty();
    }
  });
  window.onhashchange = function () {
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

  $('#registerForm').submit(function () {
    if ($("#registerBox").val() != "") {
      $('#errors').empty();
      user.socket.emit("message", $("#registerBox").val());
      $("#registerBox").val("");
    }
  });

  $('#viewLobby').click(() => {
    transitionFromGameToLobby();
  });
});

function transitionFromLandingToLobby() {
  $('#landingPage').fadeOut(200, function () {
    $('#lobbyContainer').fadeIn(200);
    location.hash = '#2';
    //scroll down the lobby chat
    lobbyChatListContainerSimpleBar.getScrollElement().scrollTop = lobbyChatListContainerSimpleBar.getScrollElement().scrollHeight;
  });
}
//only use when the player has created a new tab
//and should connect to the game they were previously in
function transitionFromLandingToGame(gameName, uid, inGame) {
  console.log(inGame);
  $('#landingPage').fadeOut('fast', function () {
    $('#playerNames').empty();
    $('#playerNames').append("<li class='gameli'>Players:</li>");
    let usernameList = $(".lobbyItem[uid=" + uid + "] .username");
    for (let i = 0; i < usernameList.length; i++) {
      appendMessage($(usernameList[i]).text(), "#playerNames", $(usernameList[i]).css('color'));
      addPlayer($(usernameList[i]).text(), '#FFFFFF');
    }
    user.gameClicked = true;
    if (inGame) {
      user.state = States.INGAMEPLAYING;
      user.register();
      $('#topLevel').fadeIn(200);
      if (gameName) {
        $('#mainGameName').text(gameName);
        resize();
      }
      //scroll down the game chatbox
      $("#inner")[0].scrollTop = $("#inner")[0].scrollHeight - $('#inner')[0].clientHeight;
      $('#topLevel')[0].scrollTop = 0;
      $('#msg').focus();
    } else {
      user.state = States.INGAMEWAITING;
      user.register();
      $('#topLevel').fadeIn(200);
      if (gameName) {
        $('#mainGameName').text(gameName);
        resize();
      }
      //scroll down the game chatbox
      $("#inner")[0].scrollTop = $("#inner")[0].scrollHeight - $('#inner')[0].clientHeight;
      $('#topLevel')[0].scrollTop = 0;
      $('#msg').focus();
    }
  });
}

function transitionFromLobbyToGame(gameName) {
  $('#landingPage').fadeOut('fast', function () {
    $('#lobbyContainer').fadeOut(200, function () {
      $('#topLevel').fadeIn(200);
      resize();
    });
    if (gameName) {
      $('#mainGameName').text(gameName);
    }
    $('#topLevel')[0].scrollTop = 0;
    $('#msg').focus();
  });
}

function transitionFromGameToLobby() {
  $('#landingPage').fadeOut('fast', function () {
    $('#topLevel').fadeOut(200, function () {
      $('#lobbyContainer').fadeIn(200);
      //scroll down the lobby chat
      lobbyChatListContainerSimpleBar.getScrollElement().scrollTop = lobbyChatListContainerSimpleBar.getScrollElement().scrollHeight;
    });
    $('#lobbyContainer')[0].scrollTop = 0;
  });
}