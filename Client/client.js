//Copyright (C) 2017 James Vaughan Craster. Licensed under AGPL version 3, see index.js for full copyright notice.
$(function () {
    var socket = io();
    
    $('form').submit(function(){
      socket.emit('message', $('#msg').val());
      $('#msg').val('');
      $('#msg')[0].placeholder = "";
      return false;
    });
    
    socket.on('message', function(msg,style,color){
      if(style == "bold"){
      	$('#chatbox').append($('<li style="font-weight:bold; color:'+color+'">').text(msg));
      }else{
	$('#chatbox').append($('<li style="color:'+color+'">').text(msg));
      }
      $('#content')[0].scrollTop = $('#content')[0].scrollHeight;
    });
});
