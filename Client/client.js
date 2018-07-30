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

var globalNow = 0;
var globalTime = 0;
var globalWarn = -1;
var gameClicked = false;
var waitingForGame = false;
var inGame = false;
var registered = false;
var notificationSound = new Audio("162464__kastenfrosch__message.mp3");
notificationSound.volume = 0.4;
var newPlayerSound = new Audio("162476__kastenfrosch__gotitem.mp3");
newPlayerSound.volume = 0.2;
var lostPlayerSound = new Audio("162465__kastenfrosch__lostitem.mp3");
lostPlayerSound.volume = 0.2;

var socket = io();

function isClientScrolledDown() {
  return Math.abs($("#inner")[0].scrollTop + $('#inner')[0].clientHeight - $("#inner")[0].scrollHeight) <= 10;
}

function convertTime(duration) {
  seconds = parseInt(duration / 1000 % 60);
  minutes = parseInt(duration / (1000 * 60) % 60);
  hours = parseInt(duration / (1000 * 60 * 60) % 24);

  hours = hours < 10 ? "0" + hours : hours;
  minutes = minutes < 10 ? "0" + minutes : minutes;
  seconds = seconds < 10 ? "0" + seconds : seconds;

  return minutes + ":" + seconds;
}

function updateTime() {
  console.log(globalTime);
  if (globalTime > 0) {
    globalTime -= Date.now() - globalNow;
    globalNow = Date.now();
    if (globalTime < 0) {
      globalTime = 0;
      $($("#roleNames li")[0]).css("color", "#cecece");
      globalWarn = -1;
    }
    $($("#roleNames li")[0]).text("Time: " + convertTime(globalTime));
    if (globalTime <= globalWarn && globalTime >= 0) {
      $($("#roleNames li")[0]).css("color", "#ff1b1b");
    }
  } else {
    $($("#roleNames li")[0]).text("Time: " + convertTime(0));
  }
}

function addPlayerToLobbyList(username) {
  $('#lobbyList').append('<li>' + username + '</li>');
}

function removePlayerFromLobbyList(username) {
  $('#lobbyList li').filter(function () {
    return $(this).text() === username;
  }).remove();
}
setInterval(updateTime, 1000);

function appendMessage(msg, target, textColor, backgroundColor, usernameColor) {
  //test if client scrolled down
  var scrollDown = isClientScrolledDown();
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
    username = msg.split(":")[0];
    messageBody = ":" + msg.split(":")[1];
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
var lobbyChatListContainerSimpleBar = new SimpleBar($('#lobbyChatListContainer')[0]);

function restart() {
  transitionFromGameToLobby();
  inGame = false;
  waitingForGame = false;
  registered = false;
  globalNow = 0;
  globalTime = 0;
  globalWarn = -1;
  $('#playerNames').empty();
  $('#playerNames').append('<li class="gameli">Players:</li>');
  $('#roleNames').empty();
  $('#roleNames').append('<li class="gameli">Time: 00:00</li>');
  $('#roleNames').append('<li class="gameli">Roles:</li>');
  $('#chatbox').empty();
  $('#leaveGame').off('click');
  $('#leaveGame').click(function () {
    if (!inGame) {
      transitionFromGameToLobby();
      socket.emit('leaveGame');
      restart();
    }
  });
}
$(function () {
  if ($('#lobbyItemList .lobbyItem').length == 0) {
    ReactDOM.render(React.createElement(
      "p",
      { id: "emptyLobbyItemPrompt", style: { textAlign: 'center', marginTop: '20px', fontStyle: 'italic', fontSize: '1.1em' } },
      "Create a new game to play"
    ), $('#lobbyItemList')[0]);
  }
  $('#registerBox').focus();
  $('#leaveGame').off('click');
  $('#leaveGame').click(function () {
    if (!inGame) {
      transitionFromGameToLobby();
      restart();
    }
  });
  $('#lobbyChatForm').submit(() => {
    console.log('active');
    socket.emit('lobbyMessage', $('#lobbyChatInput').val());
    $('#lobbyChatInput').val('');
    return false;
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
            console.log('hidden');
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
        location.reload();
      }
    });
  });
  $(".messageForm").submit(function () {
    //prevent submitting empty messages
    if ($("#msg").val() == "") {
      return false;
    }
    socket.emit("message", $("#msg").val());
    $("#msg").val("");
    return false;
  });

  socket.on("transitionToLobby", function () {
    transitionFromLandingToLobby();
  });
  socket.on("transitionToGame", function (name, uid) {
    transitionFromLandingToGame(name, uid);
  });
  socket.on("message", function (msg, textColor, backgroundColor, usernameColor) {
    appendMessage(msg, "#chatbox", textColor, backgroundColor, usernameColor);
  });

  socket.on("restart", function () {
    restart();
  });
  socket.on("registered", function () {
    transitionFromLandingToLobby();
    registered = true;
    $('#leaveGame').off('click');
    $('#leaveGame').click(function () {
      if (!inGame) {
        transitionFromGameToLobby();
        socket.emit('leaveGame');
        restart();
      }
    });
  });
  socket.on("clear", function () {
    $('ul').clear();
  });
  socket.on("setTitle", function (title) {
    $(document).attr('title', title);
  });
  socket.on("notify", function () {
    notificationSound.play();
  });
  socket.on('removeGameFromLobby', function (uid) {
    $('#container .lobbyItem[uid=' + uid + ']').remove();
    if ($('#lobbyItemList .lobbyItem').length == 0) {
      ReactDOM.render(React.createElement(
        "p",
        { id: "emptyLobbyItemPrompt", style: { textAlign: 'center', marginTop: '20px', fontStyle: 'italic', fontSize: '1.1em' } },
        "Create a new game to play"
      ), $('#lobbyItemList')[0]);
    }
  });
  socket.on("addNewGameToLobby", function (name, type, uid) {
    $('#emptyLobbyItemPrompt').css('display', 'none');
    var div = document.createElement('div');
    div.className = "lobbyItemReactContainer";
    $('#container .simplebar-content #lobbyItemList').prepend(div);
    ReactDOM.render(React.createElement(LobbyItem, { name: name, type: type, uid: uid, ranked: "false" }), $('#container .simplebar-content .lobbyItemReactContainer:first')[0]);
    $('.lobbyItem').off('click');
    $('.lobbyItem').click(function () {
      gameClicked = true;
      if (!waitingForGame) {
        transitionFromLobbyToGame($(this).attr('name'));
      } else {
        transitionFromLobbyToGame();
      }
      location.hash = 3;
      if ($(this).attr('inPlay') == "false") {
        if (!waitingForGame) {
          $('#chatbox').empty();
          $('#playerNames').empty();
          $('#playerNames').append("<li class='gameli'>Players:</li>");
          var usernameList = $(".lobbyItem[uid=" + $(this).attr('uid') + "] .username");
          for (i = 0; i < usernameList.length; i++) {
            appendMessage($(usernameList[i]).text(), "#playerNames", $(usernameList[i]).css('color'));
          }
          socket.emit("gameClick", $(this).attr('uid'));
          waitingForGame = true;
        }
      } else {
        if (!waitingForGame) {
          $('#playerNames').empty();
          $('#playerNames').append("<li class='gameli'>Players:</li>");
          var usernameList = $(".lobbyItem[uid=" + $(this).attr('uid') + "] .username");
          for (i = 0; i < usernameList.length; i++) {
            appendMessage($(usernameList[i]).text(), "#playerNames", $(usernameList[i]).css('color'));
          }
          appendMessage("This game has already started, please join a different one.", '#chatbox', undefined, "#950d0d");
        }
      }
    });
  });
  socket.on("newGame", function () {
    inGame = true;
    $('#leaveGame').off('click');
    $('#leaveGame').click(function () {
      $('#leaveGameModal').modal('show');
    });;
  });
  socket.on("endChat", function () {
    console.log('active');
    $('#leaveGame').off('click');
    $('#leaveGame').click(function () {
      transitionFromGameToLobby();
      socket.emit('leaveGame');
      restart();
    });
  });
  socket.on("sound", function (sound) {
    if (sound == "NEWGAME") {
      notificationSound.play();
    } else if (sound == "NEWPLAYER") {
      newPlayerSound.play();
    } else if (sound == "LOSTPLAYER") {
      lostPlayerSound.play();
    }
  });
  socket.on("registrationError", function (error) {
    $('<p style="color:red;font-size:18px;margin-top:15px;">Invalid: ' + error + '</p>').hide().appendTo('#errors').fadeIn(100);
  });
  $('document').resize(function () {});
  socket.on("lobbyMessage", function (msg, textColor, backgroundColor) {
    appendMessage(msg, "#lobbyChatList", textColor, undefined, '#cecece');
    if (Math.abs(lobbyChatListContainerSimpleBar.getScrollElement().scrollTop + lobbyChatListContainerSimpleBar.getScrollElement().clientHeight - lobbyChatListContainerSimpleBar.getScrollElement().scrollHeight) <= 50) {
      lobbyChatListContainerSimpleBar.getScrollElement().scrollTop = lobbyChatListContainerSimpleBar.getScrollElement().scrollHeight;
    }
  });
  socket.on("rightMessage", function (msg, textColor, backgroundColor) {
    appendMessage(msg, "#playerNames", textColor, backgroundColor);
  });
  socket.on("leftMessage", function (msg, textColor, backgroundColor) {
    appendMessage(msg, "#roleNames", textColor, backgroundColor);
  });
  socket.on("removeRight", function (msg) {
    removeMessage(msg, "#playerNames");
    removeMessage(" " + msg, '#playerNames');
    console.log("active: " + msg);
  });
  socket.on("removeLeft", function (msg) {
    removeMessage(msg, "#roleNames");
  });
  socket.on("lineThroughPlayer", function (msg, color) {
    lineThroughPlayer(msg, color);
    lineThroughPlayer(" " + msg, color);
  });
  socket.on("markAsDead", function (msg) {
    markAsDead(msg);
    markAsDead(" " + msg);
  });
  socket.on("reconnect", function () {
    console.log("disconnected and then reconnected");
  });
  socket.on("setTime", function (time, warn) {
    if (time > 0) {
      $($("#roleNames li")[0]).text("Time: " + convertTime(time));
    }
    $($("#roleNames li")[0]).css("color", "#cecece");
    globalNow = Date.now();
    globalTime = time;
    globalWarn = warn;
  });
  $('.lobbyItem').off('click');
  $('.lobbyItem').click(function () {
    console.log('active');
    gameClicked = true;
    if (!waitingForGame) {
      transitionFromLobbyToGame($(this).attr('name'));
    } else {
      transitionFromLobbyToGame();
    }
    location.hash = 3;
    if ($(this).attr('inPlay') == "false") {
      if (!waitingForGame) {
        $('#chatbox').empty();
        $('#playerNames').empty();
        $('#playerNames').append("<li class='gameli'>Players:</li>");
        var usernameList = $(".lobbyItem[uid=" + $(this).attr('uid') + "] .username");
        for (i = 0; i < usernameList.length; i++) {
          appendMessage($(usernameList[i]).text(), "#playerNames", $(usernameList[i]).css('color'));
        }
        socket.emit("gameClick", $(this).attr('uid'));
        waitingForGame = true;
      }
    } else {
      if (!waitingForGame) {
        $('#playerNames').empty();
        $('#playerNames').append("<li class='gameli'>Players:</li>");
        var usernameList = $(".lobbyItem[uid=" + $(this).attr('uid') + "] .username");
        for (i = 0; i < usernameList.length; i++) {
          appendMessage($(usernameList[i]).text(), "#playerNames", $(usernameList[i]).css('color'));
        }
        appendMessage("This game has already started, please join a different one.", '#chatbox', undefined, "#950d0d");
      }
    }
  });

  socket.on("updateGame", function (name, playerNames, playerColors, number, inPlay) {
    if (inPlay) {
      //$('#container div:nth-child(' + number.toString() + ') p:first span:first').html(name);
      $('#container div[uid=' + number.toString() + '] p:first span:last').html("IN PLAY");
      $('#container div[uid=' + number.toString() + ']').attr('inPlay', "true");
    } else {
      //$('#container div:nth-child(' + number.toString() + ') p:first span:first').html(name);
      $('#container div[uid=' + number.toString() + '] p:first span:last').html("OPEN");
      $('#container div[uid=' + number.toString() + ']').attr('inPlay', "false");
    }
    var div = $('#container div[uid=' + number.toString() + '] p:last span:first');
    div.empty();
    for (i = 0; i < playerNames.length; i++) {
      if (i == 0) {
        div.append('<span class="username" style="color:' + playerColors[i] + '">' + playerNames[i]);
      } else {
        div.append('<span>,');
        div.append('<span class="username" style="color:' + playerColors[i] + '"> ' + playerNames[i]);
      }
    }
  });
  socket.on('addPlayerToLobbyList', function (username) {
    addPlayerToLobbyList(username);
  });
  socket.on('removePlayerFromLobbyList', function (username) {
    removePlayerFromLobbyList(username);
  });
  //removes player from game list
  socket.on("removePlayerFromGameList", function (name, game) {
    var spanList = $('#container div[uid=' + game + '] p:last span:first span');
    for (i = 0; i < spanList.length; i++) {
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
  socket.on("addPlayerToGameList", function (name, color, game) {
    var div = $('#container div[uid=' + game + '] p:last span:first');
    var spanList = $('#container div[uid=' + game + '] p:last .username');
    if (spanList.length == 0) {
      div.append('<span class="username" style="color:' + color + '">' + name);
    } else {
      div.append('<span>,');
      div.append('<span class="username" style="color:' + color + '"> ' + name);
    }
  });
  socket.on("markGameStatusInLobby", function (game, status) {
    console.log(game);
    console.log(status);
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
    } else if (location.hash == "#3" && gameClicked) {
      transitionFromLobbyToGame();
    } else if (location.hash == "#2") {
      if (!waitingForGame) {
        restart();
      } else {
        transitionFromGameToLobby();
      }
    }
  };
  $(window).resize(function () {
    $('#inner')[0].scrollTop = $('#inner')[0].scrollHeight;
  });

  $('#registerForm').submit(function () {
    if ($("#registerBox").val() != "") {
      $('#errors').empty();
      socket.emit("message", $("#registerBox").val());
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
function transitionFromLandingToGame(gameName, uid) {
  $('#landingPage').fadeOut('fast', function () {
    $('#playerNames').empty();
    $('#playerNames').append("<li class='gameli'>Players:</li>");
    var usernameList = $(".lobbyItem[uid=" + uid + "] .username");
    for (i = 0; i < usernameList.length; i++) {
      appendMessage($(usernameList[i]).text(), "#playerNames", $(usernameList[i]).css('color'));
    }
    gameClicked = true;
    waitingForGame = true;
    registered = true;
    $('#topLevel').fadeIn(200);
    if (gameName) {
      $('#mainGameName').text(gameName);
    }
    //scroll down the game chatbox
    $("#inner")[0].scrollTop = $("#inner")[0].scrollHeight - $('#inner')[0].clientHeight;
    $('#topLevel')[0].scrollTop = 0;
    $('#msg').focus();
  });
}

function transitionFromLobbyToGame(gameName) {
  $('#landingPage').fadeOut('fast', function () {
    $('#lobbyContainer').fadeOut(200, function () {
      $('#topLevel').fadeIn(200);
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