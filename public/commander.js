function Commander(currRoomChatID) {

  this.currRoomChatID = currRoomChatID;

  this.playCommand = function(chatInput) {
    //if url detected, send it directly to broadcast
    if (chatInput.indexOf("youtube.com") != -1 || chatInput.indexOf("youtu.be") != -1) {
      var split = chatInput.split(" ");
      if (split[1]) {
        var url = split[1];
        var songXHR = new XMLHttpRequest();
        songXHR.open("POST", "/broadcast_song/");
        songXHR.send(JSON.stringify({room_id: this.currRoomChatID, url: url}));
      }
    }
    else {
      var query = chatInput.substring(6);
      if (query.length > 0) {
        var searchXHR = new XMLHttpRequest();
        searchXHR.open("GET", "/youtube_search/" + query);
        searchXHR.onreadystatechange = function(e) {
          if (searchXHR.readyState == 4 && searchXHR.status == 200) {
            var response = JSON.parse(xhr.responseText);
            var url = "www.youtube.com/watch?v=" + response.youtube_video_id;
            var songXHR = new XMLHttpRequest();
            songXHR.open("POST", "/broadcast_song/");
            songXHR.send(JSON.stringify({room_id: this.currRoomChatID, url: url}));
          }
        }
        searchXHR.send();
      }
    }
  }

  this.easterCommand = function(chatInput, uploadMessage) {
    var msg = doCommand(chatInput, this.currRoomChatID)
      if (msg) {
        uploadMessage(msg);
      }
      else {
        // reset fields     
        this.clearInput();
        this.focusInput();
        if (chatInput === "/stop") {
          var player = document.getElementById("iframePlayer");
          if (player.src !== "") {
            player.src = "";
            var songXHR = new XMLHttpRequest();
            songXHR.open("POST", "/broadcast_song/");
            songXHR.send(JSON.stringify({room_id: this.currRoomChatID, url: null}));
          }
        }
      }
  }

  this.searchCommand = function(chatInput) {
    console.log("SEARCHING");

  /*
    var query = chatInput.substring(1);
    //search mode
    if (query.length > 0) {
      $scope.searchMode = true;
      $scope.searchQuery = query;
      loadingOverallAnimation.removeAttribute("hidden");
      seeMoreMessages(1000, function(){
        var results = []
        for(var i = chatMessageList.length-1; i >= 0; i--) {
          if (chatMessageList[i].text.toLowerCase().includes(query.toLowerCase()) 
            || chatMessageList[i].name.toLowerCase().includes(query.toLowerCase())) {
            //results.push($scope.chatMessageList[i]);
            results.unshift(chatMessageList[i]);
          }
        }
      $scope.chatMessageList = results;
      scrollLock = true;
      loadingOverallAnimation.setAttribute("hidden", null);
      $timeout(scrollDown);
      });
    }
    //return to normal
    else {
      this.searchMode = false;
      this.searchQuery = null;
      loadingOverallAnimation.removeAttribute("hidden");
      //maximum jank to let animation start
      setTimeout(function(){
        $scope.chatMessageList = chatMessageList;
        scrollLock = false;
        loadingOverallAnimation.setAttribute("hidden", null);
        //$timeout(scrollDown);
        this.scrollDown();
      }, 1);
    }
    this.clearInput();
    */
  }

}
