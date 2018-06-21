/*   Copyright (C) 2017 James V. Craster. This file is part of OpenWerewolf. 
     OpenWerewolf is free software: you can redistribute it and/or modify
     it under the terms of the GNU Affero General Public License as published
     by the Free Software Foundation, version 3 of the License.
     OpenWerewolf is distributed in the hope that it will be useful,
     but WITHOUT ANY WARRANTY; without even the implied warranty of
     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
     GNU Affero General Public License for more details.
     You should have received a copy of the GNU Affero General Public License
     along with OpenWerewolf.  If not, see <http://www.gnu.org/licenses/>
*/
var globalNow = 0;
var globalTime = 0;
var globalWarn = -1;

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
  socket.on("registered", function () {});
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
  socket.on("setTime", function (time, warn) {
    $($("#roleNames li")[0]).text("Time: " + convertTime(time));
    $($("#roleNames li")[0]).css("color", "#cecece");
    globalNow = Date.now();
    globalTime = time;
    globalWarn = warn;
  });
  socket.on("sendGame", function (name, playerNames, playerColors) {
    //console.log(playerNames);
    //console.log(playerColors);
    //console.log(name);
    $('#container').append($('<div class="item">'));
    $('#container div:last').append($('<p>' + name + '</p>'));
    $('#container div:last').append($('<br>'));
    $('#container div:last').append($('<p>Players: </p>'));
    for (i = 0; i < playerNames.length; i++) {
      if (i == 0) {
        $('#container div:last p:last').append('<span style="color:' + playerColors[i] + '">' + playerNames[i]);
      } else {
        $('#container div:last p:last').append('<span>,')
        $('#container div:last p:last').append('<span style="color:' + playerColors[i] + '"> ' + playerNames[i]);
      }
    }
    $('.item').click(function () {
      $('#lobby').hide("slow");
      $('#topLevel').show("slow");
      location.hash = 2;
    });
  });
  $('.item').click(function () {
    $('#lobby').hide("slow");
    $('#topLevel').show("slow");
    location.hash = 2;
  });
  socket.on("updateGame", function (name, playerNames, playerColors, number) {
    var div = $('#container div:nth-child(' + number.toString() + ') p:last');
    div.empty();
    div.html("Players: ");
    console.log(playerNames);
    console.log(playerColors);
    console.log(name);
    console.log(number);
    for (i = 0; i < playerNames.length; i++) {
      if (i == 0) {
        div.append('<span style="color:' + playerColors[i] + '">' + playerNames[i]);
      } else {
        div.append('<span>,')
        div.append('<span style="color:' + playerColors[i] + '"> ' + playerNames[i]);
      }
    }
  });
  window.onhashchange = function () {
    if (location.hash.length > 0) {
      $('#lobby').hide("slow");
      $('#topLevel').show("slow");
    } else {
      $('#lobby').hide();
      $('#topLevel').hide("slow");
      $('#lobby').show("slow");
    }
  }
});