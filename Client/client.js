/*   Copyright (C) 2017 James Vaughan Craster. This file is part of OpenWerewolf. 
     OpenWerewolf is free software: you can redistribute it and/or modify
     it under the terms of the GNU Affero General Public License as published
     by the Free Software Foundation, version 3 of the License.
     OpenWerewolf is distributed in the hope that it will be useful,
     but WITHOUT ANY WARRANTY; without even the implied warranty of
     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
     GNU Affero General Public License for more details.
     You should have received a copy of the GNU Affero General Public License
     along with OpenWerewolf.  If not, see <http://www.gnu.org/licenses/>*/

$(function () {
    var socket = io();
    
    $('form').submit(function(){
      if($('#msg').val() == ""){
        return false;
      }
      socket.emit('message', $('#msg').val());
      $('#msg').val('');
      $('#msg')[0].placeholder = "";
      return false;
    });
    
    socket.on('message', function(msg){
      $('#chatbox').append($('<li>').text(msg));
      $('#content')[0].scrollTop = $('#content')[0].scrollHeight;
    });
});
