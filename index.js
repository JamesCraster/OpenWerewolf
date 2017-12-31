var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static('Client'));
app.get('/', function(req, res){
  res.sendFile(__dirname + '/client.html');
});

Settings = {
	playerCount:5
}

var playerCount = 0;
io.on('connection', function(socket){
  socket.registered = 0;
  var letters = /^[A-Za-z]+$/;
  
  socket.on('message', function(msg){
    if(!socket.registered){
      //get rid of spaces in name
      msg = msg.replace(/\s/g,'');
      //validate username 
      if(!(msg.length < 2) && !(msg.length > 10) && letters.test(msg)){
        socket.registered = 1;
        socket.username = msg.trim().toLowerCase();
	playerCount ++;
        if(Settings.playerCount - playerCount > 0){
        	io.emit('message', socket.username + ' has joined the game. Game will begin when '+
	 	(Settings.playerCount - playerCount).toString() + " more players have joined." , "bold","green"); 	
	}else{
		io.emit('message', socket.username + ' has joined the game. The game begins now.' , "bold","green");
	}
      }else{
	socket.emit('message', 'Invalid username: must be only letters (no numbers or punctuation) and between 2 and 10 characters.', "bold","black");
      }
    }else{
      if(msg.trim() != ''){
    	  io.emit('message', socket.username + ': ' + msg, "black");
      }
    }
  });
});

var port = process.env.PORT || 8080;
http.listen(port, function(){
  console.log('Port is:' + port);
});
