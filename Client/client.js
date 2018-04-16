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
     
     Additional terms under GNU AGPL version 3 section 7:
     I (James Craster) require the preservation of this specified author attribution 
     in the Appropriate Legal Notices displayed by works containing material that has 
     been added to OpenWerewolf by me: 
     "This project includes code from OpenWerewolf. OpenWerewolf author: James V. Craster." 
*/
function isClientScrolledDown() {
  return Math.abs($("#inner")[0].scrollTop + $('#inner')[0].clientHeight - $("#inner")[0].scrollHeight) <= 10;
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

  socket.on("message", function (msg, textColor, backgroundColor) {
    //test if client scrolled down
    var scrollDown = isClientScrolledDown();
    if (textColor && backgroundColor) {
      $("#chatbox").append($("<li style='color:" + textColor + ";background-color:" + backgroundColor + "'>").text(msg));
    } else if (textColor) {
      $("#chatbox").append($("<li style='color:" + textColor + "'>").text(msg));
    } else if (backgroundColor) {
      $("#chatbox").append($("<li style='background-color:" + backgroundColor + "'>").text(msg));
    } else {
      $("#chatbox").append($("<li>").text(msg));
    }
    //only scroll down if the client was scrolled down before the message arrived
    if (scrollDown) {
      $("#inner")[0].scrollTop = $("#inner")[0].scrollHeight - $('#inner')[0].clientHeight;
    }
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
});