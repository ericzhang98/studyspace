myApp.controller("RoomController", ["$scope", "$rootScope", "$http", "$timeout", "$window",
function($scope, $rootScope, $http, $timeout, $window) {
/*-------------------------------------------------------------------*/
  /****************************** CHAT ROOM ****************************/
  /*-------------------------------------------------------------------*/

  // list of message objects with: email, name, roomID, text, timeSent
  var chatMessageList = [];
  var div = document.getElementById("chat-message-pane");
  var chatInputBox = document.getElementById("chatInputBox");
  var loadingMessagesAnimation = document.getElementById("loading-messages");
  var lastKey = null;
  var scrollLock = false;
  var currTyping = [];
  var isTyping = false;
  var loadingOverallAnimation = document.getElementById("loading-overall");
  $scope.chatPinnedMessageList = [];
  $scope.searchQuery = null;
  $scope.searchMode = true;


  /*whiteboard*/
  var whiteboard = document.getElementById("whiteboard");
  var whiteboardContainer = document.getElementById("whiteboard-container");

  $scope.toggleWhiteboard = function() {
    
    if ($scope.showWhiteboard) {
      $scope.showWhiteboard = false;
      console.log("hide");
      whiteboard.setAttribute("src", "whiteboard.html#" + $rootScope.currRoomCallID);
      whiteboardContainer.setAttribute("hidden", null);
    }

    else {
      $scope.showWhiteboard = true;
      whiteboard.setAttribute("src", "whiteboard.html#" + $rootScope.currRoomCallID);
      whiteboardContainer.removeAttribute("hidden");
    }
  }

  /************************* JOINING A CHATROOM ************************/

  // Listener that allows other controllers to call joinRoomChat
  $scope.$on('joinRoomChat', function(event, data) {
    $scope.joinRoomChat(data.room_id);
  })

  // Join a room's chat
  $scope.joinRoomChat = function(room_id) {

    //leave old room
    if ($rootScope.currRoomChatID) {
      //temp
      isTyping = false;
      var temp = new XMLHttpRequest();
      temp.open("GET", "/typing/false/" + $rootScope.currRoomChatID, true);
      temp.send();
    }

    if ($rootScope.currRoomChatID != room_id) {

      $rootScope.currRoomChatID = room_id;

      // turn off any pre-existing listeners
      if (chatDatabase != null) {
        chatDatabase.off();
      }
      // empty our message list in logic and UI and reset control vars
      chatMessageList = [];
      $scope.chatPinnedMessageList = [];
      $scope.showPinnedMessages = false;

      if ($scope.viewVideo) {
        $scope.toggleViewVideo();
      }

      lastKey = null;
      scrollLock = false;
      updateChatView();
      $scope.chatInput = "";

      $scope.searchQuery = null;
      $scope.searchMode = false;

      // set up and start new listener if room_id isn't null
      if (room_id) {
        chatDatabase = databaseRef.child("RoomMessages").child($rootScope.currRoomChatID);
        chatPinnedDatabase = databaseRef.child("RoomPinnedMessages").child($rootScope.currRoomChatID);
        startChatMessages();
      }

      // empty typing list
      if (typingDatabase != null) {
        typingDatabase.off();
      }
      currTyping = [];

      if (room_id) {
        typingDatabase = databaseRef.child("RoomTyping").child($rootScope.currRoomChatID);
        //setTimeout(
        startCurrTyping();
        //], 50); //in case it's a dm, need to wait for other user info?
      }

      if (songDatabase != null) {
        songDatabase.off();
      }
      if (room_id) {
        songDatabase = databaseRef.child("RoomSong").child(room_id);
        songDatabase.on("value", function(snapshot) {
          var val = snapshot.val();
          if (val) {
            playSong(val.url);
            $scope.currSongTitle = val.title;
            $rootScope.safeApply($scope);
          }
          else {
            var player = document.getElementById("iframePlayer");
            player.src = "";
            $scope.currSongTitle = null;
            $rootScope.safeApply($scope);
          }
        });
      }
      else {
        var player = document.getElementById("iframePlayer");
        player.src = "";
      }

      if (room_id) {
        $scope.showWhiteboard = false;
        whiteboard.removeAttribute("src");
        whiteboardContainer.setAttribute("hidden", null);
      }
    }
  }
  /*********************************************************************/
  /*************************** SENDING CHATS ***************************/

  // Send chat when send button is pressed
  $scope.sendChatMessage = function(chatInput) {
    if (chatInput) {
      // easter eggs
      if (SECRET_COMMANDS.indexOf(chatInput) != -1) {
        // do the command, and if it returns a message
        // then upload it
        var msg = doCommand(chatInput, $rootScope.currRoomChatID)
        if (msg) {
          uploadMessage(msg);
        }
        else {
          // reset fields     
          $scope.chatInput = "";
          chatInputBox.focus();
          if (chatInput === "/stop") {
            var player = document.getElementById("iframePlayer");
            if (player.src !== "") {
              //console.log("was playing, but now stop");
              player.src = "";
              $http.post("/broadcast_song/", {room_id: $rootScope.currRoomChatID, url: null});
            }
            //console.log("stop on controller");
          }
        }
      }
      else if (chatInput.indexOf("/play") == 0) {
        //if url detected, send it directly to broadcast
        if (chatInput.indexOf("youtube.com") != -1 || chatInput.indexOf("youtu.be") != -1) {

          var split = chatInput.split(" ");
          if (split[1]) {
            var url = split[1];
            $http.post("/broadcast_song/", {room_id: $rootScope.currRoomChatID, url: url});
          }
          else {
            //console.log("Please put in a valid URL");
          }
        }
        else {
          var query = chatInput.substring(6);
          if (query.length > 0) {
            //console.log("querying youtube and playing first result");
            $http.get("/youtube_search/" + query).then(function(response) {
              if (response.data) {
                var url = "www.youtube.com/watch?v=" + response.data.youtube_video_id;
                $http.post("/broadcast_song/", {room_id: $rootScope.currRoomChatID, url: url});
              }
            });
          }
        }
        $scope.chatInput = "";
        chatInputBox.focus();
      }

      //search command
      else if (chatInput.indexOf("#") == 0) {
        //console.log("search");
        var query = chatInput.substring(1);
        //search mode
        if (query.length > 0) {
          //console.log(query);
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
          $scope.searchMode = false;
          $scope.searchQuery = null;
          loadingOverallAnimation.removeAttribute("hidden");
          //maximum jank to let animation start
          setTimeout(function(){
          $scope.chatMessageList = chatMessageList;
          scrollLock = false;
          loadingOverallAnimation.setAttribute("hidden", null);
          $timeout(scrollDown);
          }, 1);
        }
        $scope.chatInput = "";
      }

      // regular message
      else {
        uploadMessage(chatInput);
      }
    }
  };

  $scope.messageClicked = function(event) {
    if ($scope.searchMode) {
      //return to normal with div selection
      var searchDiv = event.currentTarget;
      //console.log(searchDiv.offsetTop);
      $scope.searchMode = false;
      $scope.searchQuery = null;
      loadingOverallAnimation.removeAttribute("hidden");
      //maximum jank to let animation start
      setTimeout(function(){
        $scope.chatMessageList = chatMessageList;
        $rootScope.safeApply($scope);
        scrollLock = false;
        loadingOverallAnimation.setAttribute("hidden", null);
        $timeout(function() {
          //console.log(searchDiv.offsetTop);
          div.scrollTop = searchDiv.offsetTop;
        });
      }, 1);
    }
  };


  $scope.keypress = function(e) {
    setTimeout(function() {
      if ($scope.chatInput) {
        if (!isTyping) {
          $http.get("/typing/true/" + $rootScope.currRoomChatID);
          isTyping = true;
        }
      }
      else {
        if (isTyping) {
          $http.get("/typing/false/" + $rootScope.currRoomChatID);
          isTyping = false;
        }
      }
    }, 10);
  };

  // Listen to RoomTyping
  function startCurrTyping() {
    typingDatabase.on("value", function(snapshot) {
      var val = snapshot.val();
      if (val) {
        currTyping = Object.keys(val);
        updateCurrTyping();
      }
      else {
        currTyping = [];
        $scope.currTyping = [];
      }
      $rootScope.safeApply($scope);
    });
  }

  function updateCurrTyping() {
    for (var i = currTyping.length-1; i >= 0; i--) {
      ////console.log($rootScope.rooms[$rootScope.currRoomChatID]);
      /*
      if (!$rootScope.rooms[$rootScope.currRoomChatID].users.includes(currTyping[i])) {
        currTyping.splice(i,1);
      }
      */
    }
    var names = []
    for (var i = 0; i < currTyping.length; i++) {
      if (currTyping[i] != myID) {
        //console.log($rootScope.users[currTyping[i]]); //if breaking, tell Eric (joinRoom after user info pull)
        if ($rootScope.users[currTyping[i]]) {
         names.push($rootScope.users[currTyping[i]].name);
        }
      }
    }
    $scope.currTyping = names;
  }

  // Upload message to the database
  function uploadMessage(chatInput) {

    // If we're in a valid room
    if ($rootScope.currRoomChatID) {

      //console.log("Sending chat with: " + chatInput);

      // Create the message and pass it on to the server
      var newChatMessage = {text: chatInput, roomID: $rootScope.currRoomChatID, timeSent: Date.now()};
      //adjust newChatMessage with whether or not it's a DM
      if ($rootScope.rooms[$rootScope.currRoomChatID].other_user_id) {
        newChatMessage.other_user_id = $rootScope.rooms[$rootScope.currRoomChatID].other_user_id;
      }
      $http.post("/send_room_message", newChatMessage).then(scrollDown);
    }

    // Reset the local chat UI/logic
    $scope.chatInput = "";
    chatInputBox.focus();
  }

  /************************** DISPLAYING CHATS *************************/

  // Set up listener for chat messages
  function startChatMessages() {
    loadingOverallAnimation.removeAttribute("hidden");
    chatPinnedDatabase.on("child_added", function(snapshot) {
      var snapshotValue = snapshot.val();
      //console.log("pin message: " + snapshotValue.text);
      if ($scope.chatPinnedMessageList.indexOf(snapshotValue) == -1) {
        $scope.chatPinnedMessageList.push(snapshotValue);
      }
      updateChatView();
    })

    chatDatabase.limitToLast(50).on("child_added", function(snapshot) {
      var snapshotValue = snapshot.val();
      snapshotValue.key = snapshot.key;

      if (lastKey == null) {
        lastKey = snapshot.key;
      }

      chatMessageList.push(snapshotValue);
      var shouldScroll = false;
      //only auto-scroll if near bottom
      if (div.scrollTop + 200 >= (div.scrollHeight - div.clientHeight)) {
        shouldScroll = true;
      }
      updateChatView();
      if (shouldScroll) {
        //setTimeout(scrollDown, 10); //scroll again upon ui update in 10ms
        scrollDown(); //scroll down immediately to ensure continuous position
      }
      loadingOverallAnimation.setAttribute("hidden", null);
    });

    //slight jank, but it's cool
    setTimeout(function() {
      loadingOverallAnimation.setAttribute("hidden", null);
    }, 500);
  }

  // Update the chat view display
  function updateChatView(func) {
    concatenateMessages();
    $scope.chatMessageList = chatMessageList;
    $rootScope.safeApply($scope, func);
  }

  // Combine messages sent by the same user within
  // CONCAT_TIME seconds of one another;
  function concatenateMessages() {
    for (var i = 0; i + 1 < chatMessageList.length;) {
      currMessage = chatMessageList[i];
      nextMessage = chatMessageList[i+1];
      // if two messages were sent by the same user within CONCAT_TIME
      if (currMessage.email == nextMessage.email &&
          nextMessage.timeSent < currMessage.timeSent + CONCAT_TIME) {
        // concatenate the messages
        currMessage.text += "\n" + nextMessage.text;
        // remove the second message
        chatMessageList.splice(i+1, 1);
      }
      else {
        i++;
      }
    }
  }

  // Scroll event listener -- see more messages if scroll within 200px of top
  var lastScroll = 0;
  $scope.scrollevent = function() {
    ////console.log("Scroll top: " + div.scrollTop);
    ////console.log("CURRENT HEIGHT: " + div.scrollHeight);
    var currentScroll = div.scrollTop;
    if(currentScroll <= 200 && currentScroll < lastScroll) {
      //don't call seeMore if still processing past one
      if (!scrollLock) { 
        seeMoreMessages(300);
      }
    }
    lastScroll = currentScroll;
  }

  // View more messages -- queries last number of msgs from Firebase and
  // updates chat view, then scrolls to correct place to maintain position
  function seeMoreMessages(messagesToAdd, callback) {
    //check if a lastKey is ready, signifying that og msgs have finished
    if (lastKey && lastKey != "DONE") {
      //show loading UI element
      loadingMessagesAnimation.removeAttribute("hidden");
      scrollLock = true; //prevent any more seeMoreMessages calls until current finishes
      var messagesSoFar = chatMessageList.length;
      //query db for past number of messages
      chatDatabase.limitToLast(messagesToAdd+1).orderByKey().endAt(lastKey)
        .once("value", function(snapshot) {
        var snapshotValue = snapshot.val();
        if (snapshotValue) {
          lastKey = Object.keys(snapshotValue)[0];
          //console.log("pulled more messages + 1: " + (Object.keys(snapshotValue).length));
          //var messageArray = Object.values(snapshotValueObject)
          var moreMessagesArray = Object.keys(snapshotValue).map(function(key) {
            var eachValue = snapshotValue[key];
            eachValue.key = key;
            return eachValue;
          });
          moreMessagesArray.pop(); //remove extra messsage b/c lastKey inclusive

          if (moreMessagesArray.length > 0) {
            chatMessageList = moreMessagesArray.concat(chatMessageList); //combine with og msgs
          }
          else {
            lastKey = "DONE"; //otherwise don't pull anymore
          }

          //keep track of height diff, update view, and then scroll by diff
          var previousHeight = div.scrollHeight;
          var previousPosition = div.scrollTop;
          ////console.log("prev height: " + (previousHeight));
          ////console.log("prev pos: " + (previousPosition));
          updateChatView();
          //setTimeout(function(){
          //$timeout(function(){
          var currHeight = div.scrollHeight;
          ////console.log("curr height: " + currHeight);
          ////console.log("Scroll down by: " + (currHeight - previousHeight));
          div.scrollTop = previousPosition + (div.scrollHeight - previousHeight);
          scrollLock = false;
          //hide loading UI element
          //});
          //}, 20);
          
        }
        loadingMessagesAnimation.setAttribute("hidden", null);
        if (callback){callback();}
      });
    }
    else {
      if (callback){callback();}
    }
  }

  // Calculate time since message was sent
  $scope.timeAgo = function(chatMessage) {
    var timeSentDate = new Date(chatMessage.timeSent);
    var monthDayString = (timeSentDate.getMonth()+1) + "/" + timeSentDate.getDate();
    var hour = timeSentDate.getHours();
    var AMPM = "AM";
    if (hour >= 12) {
      hour -= 12;
      AMPM = "PM";
    }
    if (hour == 0) {
      hour = 12;
    }

    var minutes = timeSentDate.getMinutes();
    if (minutes < 10) {
      minutes = "0" + minutes;
    }
    var timeString = hour + ":" + minutes + " " + AMPM;

    var dateString = monthDayString + " " + timeString;
    return dateString;
  };

  // Scroll chat view to bottom 
  function scrollDown() {
    div.scrollTop = div.scrollHeight - div.clientHeight;
  }

  /*********************************************************************/
  /** PIN LUL *************************************/

  $scope.showPinnedMessages = false;

  $scope.pinChatMessage = function(key, user_id, name, time_sent) {

    $http.post("/pin_message/", {
      "room_id": $rootScope.currRoomChatID, 
      "chat_message_key": key, 
      "user_id": user_id, 
      "name": name, 
      "time_sent": time_sent, 
      "concat_text": getConcatenatedMessageText(key)});
  }

  function getConcatenatedMessageText(chatMessageKey) {
    var concat_text;
    chatMessageList.forEach(function(message) {
      if (message.key == chatMessageKey) {
        concat_text = message.text;
      }
    })

    /*
    var concat_array = concat_text.split("\n");
    var concat_text_parsed = "";
    concat_array.forEach(function(line) {
      concat_text_parsed += line + "%0A";
    })*/
    //var concat_text_parsed = encodeURI(concat_text);
    var concat_text_parsed = concat_text;
    //console.log("text is " + concat_text_parsed);
    return concat_text_parsed;
  }

  $scope.togglePinnedMessages = function() {
    $scope.showPinnedMessages = !$scope.showPinnedMessages;
  }

  $scope.isPinned = function(key) {
    var contains = false;
    $scope.chatPinnedMessageList.forEach(function(message) {
      if (message.key == key) {
        contains = true;
      }
    })
    return contains;
  }

}]);

myApp.directive("scroll", ["$window", function ($window) {
  return {
    scope: {
      scrollEvent: '&'
    },
    link : function(scope, element, attrs) {
      $("#"+attrs.id).scroll(function($e) { scope.scrollEvent != null ?  scope.scrollEvent()($e) : null })
    }
  }
}]);