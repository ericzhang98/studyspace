function Commander(currRoomChatID) {

  this.currRoomChatID = currRoomChatID;
  var thisCommander = this;

  this.easterCommand = function(chatInput, uploadMessage) {
    var msg = doCommand(chatInput, this.currRoomChatID)
    if (msg) {
      uploadMessage(msg);
    }
  }

  this.playCommand = function(chatInput) {
    //if url detected, send it directly to broadcast
    if (chatInput.indexOf("youtube.com") != -1 || chatInput.indexOf("youtu.be") != -1) {
      var split = chatInput.split(" ");
      if (split[1]) {
        var url = split[1];
        var songXHR = new XMLHttpRequest();
        songXHR.open("POST", "/broadcast_song/");
        songXHR.setRequestHeader("Content-Type", "application/json");
        songXHR.send(JSON.stringify({room_id: thisCommander.currRoomChatID, url: url}));
      }
    }
    else {
      var query = chatInput.substring(6);
      if (query.length > 0) {
        var searchXHR = new XMLHttpRequest();
        searchXHR.open("GET", "/youtube_search/" + query);
        searchXHR.onreadystatechange = function(e) {
          if (searchXHR.readyState == 4 && searchXHR.status == 200) {
            var response = JSON.parse(searchXHR.responseText);
            var url = "www.youtube.com/watch?v=" + response.youtube_video_id;
            var songXHR = new XMLHttpRequest();
            songXHR.open("POST", "/broadcast_song/");
            songXHR.setRequestHeader("Content-Type", "application/json");
            songXHR.send(JSON.stringify({room_id: thisCommander.currRoomChatID, url: url}));
          }
        }
        searchXHR.send();
      }
    }
  }

  this.stopCommand = function() {
    var player = document.getElementById("iframePlayer");
    if (player.src !== "") {
      player.src = "";
      var songXHR = new XMLHttpRequest();
      songXHR.open("POST", "/broadcast_song/");
      songXHR.setRequestHeader("Content-Type", "application/json");
      songXHR.send(JSON.stringify({room_id: thisCommander.currRoomChatID, url: null}));
    }
  }

}
