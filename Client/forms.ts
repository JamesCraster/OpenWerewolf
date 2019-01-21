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
import { user } from "./client";
declare let SimpleBar: any;

//set up simplebar and modals
$(".newAccountButton").click(function() {
  $("#registerModal").modal("show");
});
$(".loginButton").click(function() {
  $("#loginModal").modal("show");
});
$("#newGameButton").click(function() {
  $("#newGameModal").modal("show");
});
$("#forgottenPassword").click(function() {
  $("#forgottenPasswordModal").modal("show");
});
$("#cancelForgottenPasswordButton").click(function() {
  $("#forgottenPasswordModal").modal("hide");
});
new SimpleBar($("#container")[0]);
new SimpleBar($("#lobbyListContainer")[0]);
$("#container .simplebar-content").css("overflow-x", "hidden");

//filtering lobby entries
$("#filterAll").click(function() {
  if ($(".lobbyItem:visible").length == 0) {
    $(".lobbyItem").fadeIn("fast");
  } else {
    $(".lobbyItem:visible").fadeOut("fast", function() {
      $(".lobbyItem").fadeIn("fast");
    });
  }
});
$("#filterOneDay").click(function() {
  if ($(".lobbyItem:visible").length == 0) {
    $(".lobbyItem").fadeIn("fast");
  } else {
    $(".lobbyItem:visible").fadeOut("fast", function() {
      $(".lobbyItem[type='OneDay']").fadeIn("fast");
    });
  }
});
$("#filterClassic").click(function() {
  if ($(".lobbyItem:visible").length == 0) {
    $(".lobbyItem").fadeIn("fast");
  } else {
    $(".lobbyItem:visible").fadeOut("fast", function() {
      $(".lobbyItem[type='Classic']").fadeIn("fast");
    });
  }
});

//make ranked and private modes mutually exclusive
$("#newGameFormRanked")
  .parent()
  .checkbox({
    onChecked: function() {
      $("#newGameFormPrivate")
        .parent()
        .checkbox("set unchecked");
    },
  });
$("#newGameFormPrivate")
  .parent()
  .checkbox({
    onChecked: function() {
      $("#newGameFormRanked")
        .parent()
        .checkbox("set unchecked");
    },
  });

$("#newGameForm").form({
  fields: {
    gameName: {
      identifier: "gameName",
      rules: [
        {
          type: "empty",
          prompt: "Please enter a name for your game",
        },
      ],
    },
  },
});
let newGameFormOngoing = false;
$("#newGameForm").submit(() => {
  if (!$("#newGameForm").form("is valid")) {
    return false;
  }
  if (newGameFormOngoing) {
    return false;
  }
  $("#newGameModalCreateButton").addClass("disabled");
  $("#addNewGameAdditionalError").text("");
  $("#newGameForm").addClass("loading");
  newGameFormOngoing = true;
  $.ajax({
    type: "POST",
    url: "/newGame",
    data: JSON.stringify({
      name: $("#newGameFormName").val(),
      type: $("#newGameForm input[name=type]:checked").val(),
    }),
    dataType: "json",
    contentType: "application/json",
    success: function(data) {
      console.log(data.result);
      if (data.result == "success") {
        //prevent multiple submissions
        //@ts-ignore
        $("#newGameModal").modal("hide", function() {
          $("#newGameModalCreateButton").removeClass("disabled");
          newGameFormOngoing = false;
          $("#newGameForm").removeClass("loading");
        });
        //@ts-ignore
        $("#newGameForm").form("reset");
        $("#addNewGameAdditionalError").text("");
      } else {
        $("#newGameModalCreateButton").removeClass("disabled");
        $("#addNewGameAdditionalError").text(data.result);
        $("#newGameFormName").val("");
        newGameFormOngoing = false;
        $("#newGameForm").removeClass("loading");
      }
    },
    error: function(error) {
      newGameFormOngoing = false;
      console.log("There has been an error");
      console.log(error);
    },
  });

  return false;
});

$("#loginForm").form({
  fields: {
    username: {
      identifier: "username",
      rules: [
        {
          type: "empty",
          prompt: "Please enter your username",
        },
      ],
    },
    password: {
      identifier: "password",
      rules: [
        {
          type: "empty",
          prompt: "Please enter your password",
        },
      ],
    },
  },
});

//create a new form rule to recongnize when the repeated password doesn't match the password
if ($.fn.form.settings.rules) {
  $.fn.form.settings.rules.repeatMatchInitial = function() {
    return (
      $("#addNewUserRepeatPassword").val() == $("#addNewUserPassword").val()
    );
  };
}

$("#addNewUserForm").form({
  fields: {
    username: {
      identifier: "username",
      rules: [
        {
          type: "empty",
          prompt: "Please enter your username",
        },
      ],
    },
    email: {
      identifier: "email",
      rules: [
        {
          type: "email",
          prompt: "Your email is invalid",
        },
      ],
    },
    password: {
      identifier: "password",
      rules: [
        {
          type: "empty",
          prompt: "Please enter your password",
        },
      ],
    },
    repeatPassword: {
      identifier: "repeatPassword",
      rules: [
        {
          type: "repeatMatchInitial",
          prompt: "Your password and repeated password don't match",
        },
      ],
    },
  },
});

$("#addNewUserForm").submit(() => {
  if (!$("#addNewUserForm").form("is valid")) {
    return false;
  }
  console.log("submitted!");
  $("#addNewUserDimmer").dimmer("show");
  $("#addNewUserAdditionalError").text("");
  $.ajax({
    type: "POST",
    url: "/register",
    data: JSON.stringify({
      username: $("#addNewUserUsername").val(),
      email: $("#addNewUserEmail").val(),
      password: $("#addNewUserPassword").val(),
      repeatPassword: $("#addNewUserRepeatPassword").val(),
    }),
    dataType: "json",
    contentType: "application/json",
    success: function(data) {
      console.log(data);
      //if result is not success, the input was not valid
      if (data.result == "success") {
        user.socket.emit("reloadClient");
        location.reload();
      } else {
        $("#addNewUserDimmer").dimmer("hide");
        $("#addNewUserUsername").val("");
        $("#addNewUserAdditionalError").text(data.result);
      }
    },
    error: function(error) {
      console.log("There has been an error");
      console.log(error);
    },
  });
  return false;
});

//set form validation rules for forgotten password - username needs to be supplied
$("#forgottenPasswordForm").form({
  fields: {
    username: {
      identifier: "username",
      rules: [
        {
          type: "empty",
          prompt: "Please enter your username",
        },
      ],
    },
  },
});
//submit confirmation that the password should be reset
$("#forgottenPasswordForm").submit(() => {
  $("#forgottenPasswordDimmer").dimmer("show");
  $("#forgottenPasswordError").text("");
  $("#forgottenPasswordError").css("display", "none");
  const username = $("#forgottenPasswordUsername").val();
  $.ajax({
    type: "POST",
    url: "/forgottenPassword",
    data: JSON.stringify({
      username: username,
    }),
    dataType: "json",
    contentType: "application/json",
    success: function(data) {
      if (data.result == "success") {
        $("#forgottenPasswordModal").modal("hide");
      } else {
        $("#forgottenPasswordError").text("Your username is incorrect");
        $("#forgottenPasswordError").css("display", "block");
      }
      $("#forgottenPasswordDimmer").dimmer("hide");
    },
    error: function(error) {
      console.log("forgotten password has returned an error");
      console.log(error);
    },
  });
  return false;
});
$("#loginForm").submit(() => {
  if (!$("#loginForm").form("is valid")) {
    return false;
  }
  $("#loginDimmer").dimmer("show");
  $.ajax({
    type: "POST",
    url: "/login",
    data: JSON.stringify({
      username: $("#loginUsername").val(),
      password: $("#loginPassword").val(),
    }),
    dataType: "json",
    contentType: "application/json",
    success: function(data) {
      if (data.result == "success") {
        user.socket.emit("reloadClient");
        location.reload();
      } else {
        console.log("fail received");
        $("#loginModalAdditionalError").text(data.result);
        $("#loginDimmer").dimmer("hide");
      }
    },
    error: function(error) {
      console.log("There has been an error");
      console.log(error);
    },
  });
  return false;
});
$(".logoutButton").click(() => {
  $.ajax({
    type: "POST",
    url: "/logout",
    data: "{}",
    dataType: "json",
    contentType: "application/json",
    success: function(data) {
      user.socket.emit("reloadClient");
      location.reload();
    },
  });
});

$(".messageForm").submit(function() {
  //prevent submitting empty messages
  if ($("#msg").val() == "") {
    return false;
  }
  user.socket.emit("message", $("#msg").val());
  $("#msg").val("");
  return false;
});

$("#leaveGameForm").form({
  fields: {
    confirmation: {
      identifier: "confirmation",
      rules: [
        {
          type: "checked",
          prompt: "You must confirm by ticking the box",
        },
      ],
    },
  },
});
