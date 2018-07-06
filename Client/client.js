/*
  Copyright 2017 James V. Craster
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
var isSafari = navigator.vendor && navigator.vendor.indexOf('Apple') > -1 &&
  navigator.userAgent && !navigator.userAgent.match('CriOS');
var registered = false;

function isClientScrolledDown() {
  return Math.abs($("#inner")[0].scrollTop + $('#inner')[0].clientHeight - $("#inner")[0].scrollHeight) <= 10;
}

function convertTime(duration) {
  var milliseconds = parseInt((duration % 1000) / 100),
    seconds = parseInt((duration / 1000) % 60),
    minutes = parseInt((duration / (1000 * 60)) % 60),
    hours = parseInt((duration / (1000 * 60 * 60)) % 24);

  hours = (hours < 10) ? "0" + hours : hours;
  minutes = (minutes < 10) ? "0" + minutes : minutes;
  seconds = (seconds < 10) ? "0" + seconds : seconds;

  return minutes + ":" + seconds;
}

function updateTime() {
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

setInterval(updateTime, 1000);

function appendMessage(msg, target, textColor, backgroundColor, usernameColor) {
  //test if client scrolled down
  var scrollDown = isClientScrolledDown();
  if (textColor && backgroundColor) {
    $(target).append($("<li style='color:" + textColor + ";background-color:" + backgroundColor + "'>"));
  } else if (textColor) {
    $(target).append($("<li style='color:" + textColor + "'>"));
  } else if (backgroundColor) {
    $(target).append($("<li style='background-color:" + backgroundColor + "'>"));
  } else {
    $(target).append($("<li>"));
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

function lineThroughPlayer(msg) {
  $("#playerNames li").filter(function () {
    return $(this).text() === msg;
  }).css("color", "grey");
  $("#playerNames li").filter(function () {
    return $(this).text() === msg;
  }).css("text-decoration", "line-through");
}

$(function () {
  if (window.location.hash == "#2") {
    //transitionToGame();
  }
  var socket = io();

  $("form").submit(function () {
    //prevent submitting empty messages
    if ($("#msg").val() == "") {
      return false;
    }
    socket.emit("message", $("#msg").val());
    $("#msg").val("");
    return false;
  });

  socket.on("message", function (msg, textColor, backgroundColor, usernameColor) {
    appendMessage(msg, "#chatbox", textColor, backgroundColor, usernameColor);
  });

  socket.on("reload", function () {
    location.reload(true);
  });
  socket.on("registered", function () {
    registered = true;
  });
  socket.on("clear", function () {
    $('ul').clear();
  })

  $('document').resize(function () {

  })
  socket.on("rightMessage", function (msg, textColor, backgroundColor) {
    appendMessage(msg, "#playerNames", textColor, backgroundColor);
  });
  socket.on("leftMessage", function (msg, textColor, backgroundColor) {
    appendMessage(msg, "#roleNames", textColor, backgroundColor);
  })
  socket.on("removeRight", function (msg) {
    removeMessage(msg, "#playerNames");
  })
  socket.on("removeLeft", function (msg) {
    removeMessage(msg, "#roleNames");
  })
  socket.on("lineThroughPlayer", function (msg) {
    lineThroughPlayer(msg);
  });
  socket.on("reconnect", function () {
    console.log("disconnected and then reconnected");
  });
  socket.on("setTime", function (time, warn) {
    $($("#roleNames li")[0]).text("Time: " + convertTime(time));
    $($("#roleNames li")[0]).css("color", "#cecece");
    globalNow = Date.now();
    globalTime = time;
    globalWarn = warn;
  });
  $('.item').click(function () {
    if (registered) {
      transitionToGame();
    } else {
      transitionToGame($(this).attr('name'));
    }
    location.hash = 2;
    if (!registered) {
      $('#playerNames').empty();
      $('#playerNames').append("<li>Players:</li>")
      var usernameList = $(".item[number=" + $(this).attr('number') + "] .username");
      for (i = 0; i < usernameList.length; i++) {
        appendMessage($(usernameList[i]).text(), "#playerNames", $(usernameList[i]).css('color'));
      }
    }
    socket.emit("gameClick", $(this).attr('number'));
  });
  socket.on("updateGame", function (name, playerNames, playerColors, number, inPlay) {
    if (inPlay) {
      $('#container div:nth-child(' + number.toString() + ') p:first span:first').html(name);
      $('#container div:nth-child(' + number.toString() + ') p:first span:last').html("[IN PLAY]");
    } else {
      $('#container div:nth-child(' + number.toString() + ') p:first span:first').html(name);
      $('#container div:nth-child(' + number.toString() + ') p:first span:last').html("[OPEN]");
    }
    var div = $('#container div:nth-child(' + number.toString() + ') p:last span:first');
    div.empty();
    for (i = 0; i < playerNames.length; i++) {
      if (i == 0) {
        div.append('<span class="username" style="color:' + playerColors[i] + '">' + playerNames[i]);
      } else {
        div.append('<span>,')
        div.append('<span class="username" style="color:' + playerColors[i] + '"> ' + playerNames[i]);
      }
    }
  });
  //removes player from lobby list
  socket.on("removePlayerFromLobbyList", function (name, game) {
    console.log(name);
    console.log(game);
    var spanList = $('#container div:nth-child(' + (game + 1).toString() + ') p:last span:first span');
    console.log(spanList);
    for (i = 0; i < spanList.length; i++) {
      if ($(spanList[i]).text() == name || $(spanList[i]).text() == " " + name) {
        //remove the separating comma if it exists 
        if (i != spanList.length) {
          $(spanList[i + 1]).remove();
        }
        if (i == 2 && spanList.length == 3) {
          $(spanList[1]).remove();
        }
        $(spanList[i]).remove();
        break;
      }
    }
  });
  socket.on("addPlayerToLobbyList", function (name, color, game) {
    var div = $('#container div:nth-child(' + (game + 1).toString() + ') p:last span:first');
    var spanList = $('#container div:nth-child(' + (game + 1).toString() + ') p:last .username');
    if (spanList.length == 0) {
      div.append('<span class="username" style="color:' + color + '">' + name);
    } else {
      div.append('<span>,')
      div.append('<span class="username" style="color:' + color + '"> ' + name);
    }
  });
  socket.on("markGameStatusInLobby", function (game, status) {
    $('#container div:nth-child(' + (game + 1).toString() + ') p:first span:last').html(status);
    if (status == "[OPEN]") {
      //clear out the player list as the game has ended
      $('#container div:nth-child(' + (game + 1).toString() + ') p:last span:first').empty();
    }
  });
  window.onhashchange = function () {
    if (location.hash.length > 0) {
      transitionToGame();
    } else {
      transitionToLobby();
    }
  }
});

function transitionToGame(gameName) {
  if (isSafari) {
    //get rid of animations
    $('#lobby').hide();
    $('#topLevel').show();
  } else {
    $('#lobby').hide("slow");
    $('#topLevel').show("slow");
  }
  if (gameName) {
    $('#name').text(gameName);
  }
  $('#msg').focus();
}

function transitionToLobby() {
  if (isSafari) {
    $('#topLevel').hide();
    $('#lobby').show();
  } else {
    $('#topLevel').hide("slow");
    $('#lobby').show("slow");
  }
}