//Main App Controller
var chatDatabase = null;
var typingDatabase = null;
var chatPinnedDatabase = null

var songDatabase = null;
var myApp = angular.module("mainApp", ["ngMaterial", "ngSanitize"]);

var CONCAT_TIME = 60*1000; // 1 minute
var currPing = null;
var USER_PING_PERIOD = 10*1000;


// initializing rootScope variables
// rootScope variables are used by multiple controllers
myApp.run(function($rootScope) {
  $rootScope.currRoomCallID = null;
  $rootScope.currRoomChatID = null;

  // Safely apply UI changes
  $rootScope.safeApply = function(scope, func) {
    var phase = scope.$root.$$phase;
    if (phase != "$apply" && phase != "$digest") {
      if (func && (typeof(func) == "function")) {
        scope.$apply(func);
      }
      else {
        scope.$apply();
      }
    }
    else {
      //console.log("Already applying");
      if (func && (typeof(func) == "function")) {
        func();
      }
    }
  }
});



/* Main controller -------------------------------------*/
myApp.controller("MainController", ["$scope", "$rootScope", "$http", "$timeout", "$window",
function($scope, $rootScope, $http, $timeout, $window) {
  //console.log("Hell yeah");

  $scope.videoEnabled = true;
  // general vars
  $scope.myID = getSignedCookie("user_id");

  $scope.myName = getSignedCookie("name");


  /*************************** ACCOUNT MANAGEMENT *********************/
  $scope.logout = function() {
    // leave current room
    leaveRoomHard($rootScope.currRoomCallID);

    /*
    //send offline ping
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/offline", true);
    xhr.send();
    */

    // erase cookies
    removeCookie("user_id");
    removeCookie("email");
    removeCookie("name");

    // go to home
    window.onbeforeunload = null;
    window.location.href = "/";
  }
  
  $scope.manageAccount = function() {
    window.location.href = "/courses";
  }

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

  /************************* JOINING A CHATROOM ************************/

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
      ////console.log($scope.rooms[$rootScope.currRoomChatID]);
      /*
      if (!$scope.rooms[$rootScope.currRoomChatID].users.includes(currTyping[i])) {
        currTyping.splice(i,1);
      }
      */
    }
    var names = []
    for (var i = 0; i < currTyping.length; i++) {
    	if (currTyping[i] != myID) {
        //console.log($scope.users[currTyping[i]]); //if breaking, tell Eric (joinRoom after user info pull)
        if ($scope.users[currTyping[i]]) {
      	 names.push($scope.users[currTyping[i]].name);
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
      if ($scope.rooms[$rootScope.currRoomChatID].other_user_id) {
        newChatMessage.other_user_id = $scope.rooms[$rootScope.currRoomChatID].other_user_id;
      }
      $http.post("/send_room_message", newChatMessage).then(scrollDown);
    }

    // Reset the local chat UI/logic
    $scope.chatInput = "";
    chatInputBox.focus();
  }

  $scope.muteBtnClass = ['glyphicon', 'glyphicon-volume-up'];
  // Toggle the mute button image
  $scope.toggleMic = function() {
    //console.log("toggling mute image");
    if ($scope.muteBtnClass[1] == 'glyphicon-volume-up') {
      $scope.muteBtnClass.pop();
      $scope.muteBtnClass.push('glyphicon-volume-off');
    }
    else {
      $scope.muteBtnClass.pop();
      $scope.muteBtnClass.push('glyphicon-volume-up');        
    }
    toggleMyStreamAudioEnabled();
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

  $scope.toggleDropdown = function(user_id) {
    $("#" + user_id + "_dropdown").click(function(e){
      e.stopPropagation();
    });

    $("#" + user_id + "_dropdown").show();

    /* Clicks within the dropdown won't make
       it past the dropdown itself */
  }

  /*-------------------------------------------------------------------*/
  /***************************** CLASSES BAR ***************************/
  /*-------------------------------------------------------------------*/

  /******************************* SETUP ******************************/

  // Scope variables
  $scope.my_class_ids = [];
  $scope.classes = {}      // class_id : class, grabbed on initial load
  $scope.class_rooms = {}  // class_id : list of room_ids
  $scope.rooms = {}        // room_id : room, listened to after grabbing classes
  $scope.users = {}        // user_id : user, info added as u join rooms
  $scope.muted_user_ids = [];
  $scope.volumes = {"ayy" : "lmao"};      // user_id : int (volume coming from them);

  // Initial call to pull data for user / classes / rooms
  getClasses();

  //setup activity ping
  //the client can mess around with this, we need to handle kicking the
  //client somehow if they stop pinging, it's fine if they can still
  //listen in on data, but other users must always be aware of prescence
  pingUserActivity(true);

  /*********************************************************************/
  /*************************** ROOM INTERACTION ************************/

  $scope.createRoom = function(class_id) {
    //console.log('create room');
    creationClassID = class_id;
    $("#modal-create-room").fadeIn(100);
    setTimeout(function() {
      $("#create-room").removeClass("hide");
      $("#create-room").addClass("fadeInBack");
    }, 100);
  }

  // Reads input from create-room-modal, creates room, and joins room
  $scope.addRoom = function() {

    // Grab modal values
    var class_id = creationClassID;

    // style choice: all room names be lower case only
    var room_name = (document.getElementById('room_name').value).toLowerCase();
    var is_lecture = document.getElementById('lecture-checkbox').checked;
    var time_created = Date.now();

    // if class_id is null do nothing
    if (class_id == null) {
      //console.log("no class selected");
      // TODO: error message
      return;
    }

    // if room_name is empty do nothing
    if (room_name.length == 0) {
      //console.log("room name must be between 1 and 28 characters");
      // TODO: error message
      return;
    }

    // Close the modal
    closeModal("#modal-create-room", "#create-room");

    // Send out addRoom request
    //console.log("adding room with class_id: " + class_id + ", room_name: " + room_name);
    var xhr = new XMLHttpRequest();
    xhr.open('GET', "/add_room/" + class_id + "/" + 
             room_name + "/" + is_lecture + "/" + time_created + "/" + $scope.myName, true);
    xhr.send();

    // Once room has been created
    xhr.onreadystatechange = function(e) {
      // room has been created
      if (xhr.readyState == 4 && xhr.status == 200) {
        var response = JSON.parse(xhr.responseText);

        if (response.error) {
          //console.log(response.error);
          return;
        }

        if (response.room_id) {

          // join the room
          $scope.joinRoom(response.room_id, response.class_id);
        }
      }
    }
  }

  // OnClick method that delegates to joinRoomCall and $scope.joinRoomChat
  // room_name is passed in when we create the room (room info not yet pulled)
  $scope.joinRoom = function(room_id, class_id) {

    // if we're not already in this room's call
    if ($rootScope.currRoomCallID != room_id) {

      // leave previous room
      leaveRoom($rootScope.currRoomCallID);

      // update currRoomCallID
      $rootScope.currRoomCallID = room_id;

      // join the call
      joinRoomCall($rootScope.currRoomCallID);

      // open up the sidebar panel with this new room
      adjustSidebarToggle(class_id);
    }

    // join this room's chat
    $scope.joinRoomChat(room_id);

  };

  // set listener that updates the volumes dict
  $scope.setVolumeListener = function(user_id, stream) {
    var soundMeter = new SoundMeter(window.audioContext);

    //console.log('setting volume listener to ' + user_id);
    soundMeter.connectToSource(stream, function(e) {
      if (e) {
        alert(e);
        return;
      }

      // every 200 seconds, check whether the soundMeter has been loud
      // update UI if this has changed
      setInterval(function() {
    
        if (soundMeter.loudDetected != soundMeter.loud) {
          ////console.log("changing volume to " + soundMeter.loudDetected);
          soundMeter.loud = soundMeter.loudDetected;
          $scope.$apply();
        }

        soundMeter.loudDetected = false;
      }, 500);

      // long interval for updating the UI
      $scope.volumes[user_id] = soundMeter;
    });
  }

  $scope.leaveRoom = function() {

    leaveRoom($rootScope.currRoomCallID);
    $rootScope.currRoomCallID = null;

    $scope.joinRoomChat(null); //leave chat room
  }

  $scope.leaveDM = function() {
    $scope.joinRoomChat($rootScope.currRoomCallID); //join or leave chat room
  }

  $window.onbeforeunload = function() {
    //in order to leave DM on window close
    var temp = new XMLHttpRequest();
    temp.open("GET", "/typing/false/" + $rootScope.currRoomChatID, true);
    temp.send();

    /*
    //send offline ping
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/offline", false);
    xhr.send();
    */
  };

  function pingUserActivity(constant) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/ping", true);
    xhr.onerror = function(){
      //console.log(xhr.status);
      showAlert("no-connection-alert", "longaf", false);
    }
    xhr.send();
    //console.log("pinging"); 
    if (constant) {
      currPing = setTimeout(pingUserActivity, USER_PING_PERIOD, true);
    }
  }

  // Sidebar setup, makes sure that at most one class is open at a time
  var $myGroup = $('#classes');
  $myGroup.on('show.bs.collapse','.collapse', function() {
    $myGroup.find('.collapse.in').collapse('hide');
  });

  function adjustSidebarToggle(class_id) {
    $scope.my_class_ids.forEach(function(my_class_id) {

      if (my_class_id == class_id && $("#" + my_class_id).is(":hidden")) {
        ////console.log("class with id " + my_class_id + " being set to visible");
        $('#' + my_class_id).collapse('toggle');
      }
    });
  };

  // onclick method that will toggles the user audio of the given user_id
  $scope.toggleUserAudio = function(user_id) {
  	// update muted_user_ids, which we use in the html to
  	// determine whether to display 'mute' or 'unmute'
    var index = $scope.muted_user_ids.indexOf(user_id);
    if (index != -1) {
    	$scope.muted_user_ids.splice(index, 1);
    } 
    else {
    	$scope.muted_user_ids.push(user_id);
    }
    toggleRemoteStreamAudioEnabled(user_id);
  };

  $scope.getRemoteStreamExists = function(user_id) {
    return document.getElementById(user_id + "_video")
    //return myRemoteStreams[user_id];
  }

  // - is this person muted?
  $scope.getRemoteStreamAudioEnabled = function(user_id) {
    //if (myRemoteStreams[user_id]) {
      //return !myRemoteStreams[user_id].muted;
      return document.getElementById(user_id + "_video") && !document.getElementById(user_id + "_video").muted;
    //} 
  }
  
  $scope.classmateDropdown = function() {
    $('.dropdown-toggle').dropdown('toggle');
  }
  
  $('.item').click(function(e){
    e.stopPropagation();
    $('.dropdown-toggle').dropdown('toggle');
  });
  
  /*********************************************************************/
  /**************************** PULLING DATA ***************************/

  // - gets all class_ids for user
  // - delegates to getClass
  function getClasses() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', "/get_my_classes", true); // responds with class_ids
    xhr.send();

    xhr.onreadystatechange = function(e) {
      if (xhr.readyState == 4 && xhr.status == 200) {
        var response = JSON.parse(xhr.responseText);

        // Set this scope variable (used in create room)
        if (response.class_ids) {
          $scope.my_class_ids = response.class_ids;
        }

        $scope.my_class_ids.push('lounge_id');

        // Get more data
        for (i = 0; i < $scope.my_class_ids.length; i++) {
          getClass($scope.my_class_ids[i]);
        }
      }
    }
  }

  // - gets class_name and class_rooms for specified class
  // - adds the class to the UI
  // - calls getRoom on all the rooms for specified class
  function getClass(class_id) {

    // get class info
    var xhr = new XMLHttpRequest();
    xhr.open('GET', "/get_class/" + class_id, true); // res with the class's name and room_ids
    xhr.send();

    xhr.onreadystatechange = function(e) {
      if (xhr.readyState == 4 && xhr.status == 200) {

        // store the class name
        var response = JSON.parse(xhr.responseText);
        response.name = response.name.toLowerCase();
        response.rooms_with_tutors = [];

        $scope.classes[class_id] = response;

        // update UI
        $rootScope.safeApply($scope);

        // add listener for class rooms
        classRoomsDatabase.child(class_id).on("value", function(snapshot) {
          if (snapshot.val()) {
            onClassRoomsChange(class_id, Object.values(snapshot.val()));
          }
        });
      }
    }
  }

  // - respond to change in a class's rooms
  // - calls removeRoom/getRoom accordingly
  function onClassRoomsChange(class_id, updated_rooms) {

    // save a copy of the current rooms
    var curr_rooms = $scope.class_rooms[class_id] ? $scope.class_rooms[class_id] : [];

    // update our rooms
    $scope.class_rooms[class_id] = updated_rooms;

    // if there is a change, apply it
    // needed for case that a room is deleted, but none are added
    if (curr_rooms != updated_rooms) {
      $rootScope.safeApply($scope);
    }

    // detach listeners for removed rooms
    for (i = 0; i < curr_rooms.length; i++) {
      // if this room is not in the new rooms, detach listener
      if (updated_rooms.indexOf(curr_rooms[i]) == -1) {
        roomsDatabase.child(curr_rooms[i]).off();
      }
    }

    // get the new rooms
    for (i = 0; i < updated_rooms.length; i++) {
      // if we weren't already listening to this room, get it
      if (curr_rooms.indexOf(updated_rooms[i]) == -1) {
        getRoom(updated_rooms[i]);
      }
    }
  }

  // finds the room's data and adds it to the list of rooms
  function getRoom(room_id) {

    // add listener for room info
    roomsDatabase.child(room_id).on("value", function(snapshot) {

      var room = snapshot.val();

      if (room) {

        var roomUniqueUsers = [];
        //rm duplicate users
        if (room.users) {
          roomUniqueUsers = Object.values(room.users);
          roomUniqueUsers = roomUniqueUsers.filter(function(element, index, self) {
            return index == self.indexOf(element);
          });
        }

        // update the room
        $scope.rooms[room_id] = new Room(room_id, room.name, room.host_id, room.class_id, 
                                         room.is_lecture, roomUniqueUsers, room.host_name ? room.host_name : "Unknown host");

        // are there tutors in here?
        detectTutors($scope.rooms[room_id]);

        // how many people are studying for this class now?
        setNumUsers($scope.rooms[room_id].class_id);

        // get room users
        updateRoomUsers($scope.rooms[room_id], updateCurrTyping);

        // update currTyping ppl
        //updateCurrTyping();

        $rootScope.safeApply($scope);
      }
    });
  }


  // Set the number of total users studying for a class at the moment
  function setNumUsers(class_id) {
    ////console.log("setting num users for " + class_id);
    $scope.classes[class_id].num_users = 0;

    for (i = 0; i < $scope.class_rooms[class_id].length; i++) {
      var room = $scope.rooms[$scope.class_rooms[class_id][i]];

      // if there are users in this room
      if (room && room.users) {
        // add them to the number of users in this class
        $scope.classes[class_id].num_users += room.users.length;
      }
    }
  }

  // check if there is a tutor present in a room
  // update rooms and classes accordingly
  function detectTutors(room) {

    var tutor_ids = $scope.classes[room.class_id].tutor_ids;

    // if this class has tutors
    if (tutor_ids && room.users) {

      for (var i = 0; i < room.users.length; i++) {
        var has_tutor = false;
        // if there is a tutor in this room or a tutor hosting this room
        if (tutor_ids.indexOf(room.users[i]) != -1) {
          has_tutor = true;
          break;
        }
      }

      room.has_tutor = has_tutor;
      var r_index = $scope.classes[room.class_id].rooms_with_tutors.indexOf(room.room_id);

      // if we weren't a tutor room before and we are now
      if (r_index == -1 && room.has_tutor) {
        $scope.classes[room.class_id].rooms_with_tutors.push(room.room_id);
      }

      // if we used to be a tutor room and we aren't anymore
      else if (r_index != -1 && !room.has_tutor) {
        $scope.classes[room.class_id].rooms_with_tutors.splice(r_index, 1);
      }
    }
  }

  $scope.isTutor = function(user_id, room_chat_id) {
    return $scope.classes[$scope.rooms[room_chat_id].class_id].tutor_ids &&
    $scope.classes[$scope.rooms[room_chat_id].class_id].tutor_ids.indexOf(user_id) != -1;
  }


  // getting the list of users in this room
  function updateRoomUsers(room, callback) {
    ////console.log("this is a room " + room);
    if (room) {
      ////console.log("getting new list of users for room: " + room.room_id);
      ////console.log($scope.rooms);
      for (var i = 0; i < room.users.length; i++) {
        if (!(room.users[i] in $scope.users)) {
          var id = room.users[i];
          $http.get('/get_user/' + room.users[i]).then(function(response) {
            $scope.users[response.data.user_id] = response.data;
            //console.log("user info pulled: " + response.data.name + " " + response.data.user_id);
            if (callback){callback();}
          });
        }
      }
    }
  }

  /*********************************************************************/

  /*********************************************************************/
  /**************************** BLOCK SYSTEM ***************************/

  var blockedUsers = {};
  
  $scope.toggleBlock = function(user_id) {
    if (!$scope.isBlocked(user_id)) {
      $scope.blockUserWithId(user_id);
    } else {
      $scope.unblock(user_id);
    }
  }
    
  $scope.isBlocked = function(user_id) {
    if (blockedUsers['blocked_user_list']) {
      var bUsers = blockedUsers['blocked_user_list'];

      if (bUsers.indexOf(user_id) != -1) {
        return true;
      }
    }
    return false;
  }

  var getIdFromName = function(name, onResponseReceived){
    var email = {"email": String(name)};
    //console.log(email);
    $http.post('/get_Id_From_Name', email).then(function(response){
      onResponseReceived(response.data);
    });    
  }

  var refresh = function(){
    blockedUsers = {};
    $http.get('/get_blocked_users').then(function(response){
      $scope.block_user_list = response.data;
      if(!(response.data[0])){
        return;
      }
      blockedUsers['user_id'] = response.data[0]['blocked_user_id'];
      blockedUsers['blocked_user_list'] = [];
      for (var i = 0; i < response.data.length; i++){
        var obj = response.data[i];
        blockedUsers['blocked_user_list'].push(obj['blocked_user_id']);

        if (myCalls[obj['blocked_user_id']]) {
          myCalls[obj['blocked_user_id']].close();
        }
      }
    });
  }
  
  var addBlock = function(blocked_user_id, onResponseReceived){
    var data = {
      "blocked_user_id": String(blocked_user_id),
    }; 
    $http.post('/add_blocked_user', data).then(function(response){
      onResponseReceived(response.data);
    });
  };

  refresh();
  
  $scope.blockUserWithId = function(user_id) {
    //console.log("blocking: " + user_id);
    addBlock(user_id, function(response) {
      showAlert('block-alert', 'normal', false);
      refresh();
    });
  }
  
  $scope.unblock = function(user_id){
    //console.log("unblocking: " + user_id)
    $http.delete('/remove_block/' + user_id).then(function(response){
      refresh();
    });
  }

  /** VIDEO LUL *************************************/
  $scope.viewVideo = false;
  $scope.userStreamSources = {};

  $scope.toggleViewVideo = function() {
    $scope.viewVideo = !$scope.viewVideo;

    // if we closed video, turn my video off
    if (!$scope.viewVideo) {
      setMyStreamVideoEnabled(false, false);
    }

    // if we opened video and we were showing before, turn my video off
    if ($scope.viewVideo && showVideo) {
      setMyStreamVideoEnabled(true);
    }
  }

  $scope.setMyStreamVideoEnabled = function(enabled, direct) {
    if (direct == undefined) {
      direct = true;
    }
    setMyStreamVideoEnabled(enabled, direct);
  }

  $scope.getVideoEnabled = function(user_id) {
    if (user_id == undefined) {
      user_id = myID;
    }
    if (user_id == myID) {
      return myStream && myStream.getVideoTracks()[0].enabled;
    }
    //return $scope.userStreams[user_id] && $scope.userStreams[user_id].getVideoTracks()[0].enabled;
  }

  /******************ADD CLASS MODAL************************************/

  var allClassesNameToID = null;
  var temp_class_ids = []; // class id's that are going to be displayed
  //TODO: ERIC -- change temp_class_ids as $scope model for clealiness?

  $scope.refreshAddClass = function() {
    //deep copy so we won't copy over temp changes, also has an extra lounge_id


    temp_class_ids = $scope.my_class_ids.slice();
    temp_class_ids.splice(temp_class_ids.indexOf('lounge_id'), 1);

    //console.log('LUL ' + $scope.my_class_ids);
    //console.log('LUL ' + temp_class_ids);

    //grab all classes if they weren't pulled before
    if (allClassesNameToID == null) {
      getAllClasses();
    }
    else {
      displayClasses();
    }
  }

  // updates UI to display currently enrolled classes
  function displayClasses() {
    $scope.tempClasses = [];
    for (var i = 0; i < temp_class_ids.length; i++) {
      if (temp_class_ids[i] != "lounge_id") {
        $scope.tempClasses.push({
          class_id: temp_class_ids[i],
          class_name: getNameOfClass(temp_class_ids[i])
        });
      }
    }
    $rootScope.safeApply($scope);
  }

  /* Add, remove, and save */
  //process input to see if the class should be added
  $scope.processSelection = function processSelection() {
    //console.log($scope.selectedItem);
    //don't trigger on null (when the selected item changes from a good one)
    if ($scope.selectedItem) {
      var class_name = $scope.selectedItem;
      if (verifyClass(class_name)) {
        var class_id = allClassesNameToID[class_name];
        // Make sure the user isn't already in the class.
        if($.inArray(class_id, temp_class_ids) == -1) {
            addClass(class_id);
        } else {
          //TODO: UI for already in class
          //console.log("already in class with name " + class_name+ " and id " + class_id);
        }
      }
      else {
        //TODO: UI for class doesn't exist
        //console.log("could not verify class with name " + class_name + " and id " + class_id);
      }
    }
  }

  function verifyClass(className) {
    var returnVal = $.inArray(className, 
        Object.keys(allClassesNameToID).map(function(x){return x;}));
    return returnVal > -1;
  }

  function addClass(class_id) {
    //console.log("UI Adding " + class_id);
    temp_class_ids.push(class_id);
    displayClasses();
    $scope.searchText = "";
  }

  $scope.removeClass = function(class_id) {
    //console.log("UI Removing " + class_id);
    var index = $.inArray(class_id, temp_class_ids);
    if(index == -1) {
      //console.log("Cannot remove class, class_id" + class_id+ " not found!")
    }
    temp_class_ids.splice(index, 1);
    displayClasses();
  }

  $scope.saveChanges = function() {
    $http.post('/enroll', {class_ids: temp_class_ids});
    closeModal("#modal-add-class", "#add-class");

    //ISAAC -- call function(temp_class_ids)
    updateLocalClasses(temp_class_ids);
  }

  function updateLocalClasses(updated_class_ids) {
    //console.log("UPDATING LOCAL CLASSES")
    updated_class_ids = updated_class_ids.concat(['lounge_id']);
    //console.log('LUL2 ' + $scope.my_class_ids);
    //console.log('LUL2 ' + updated_class_ids);
    var noChange = true;
    updated_class_ids.forEach(function(class_id) {
      // for classes I've added
      if ($scope.my_class_ids.indexOf(class_id) == -1) {
        getClass(class_id);
        noChange = false;
      }
    });

    noChange = noChange && $scope.my_class_ids.length == updated_class_ids.length; 

    $scope.my_class_ids = updated_class_ids;
    $rootScope.safeApply($scope);

    if (!noChange) {
      //console.log('was changed');
      showAlert("course-change-alert", 'normal', false);
    }
  }

  // populates the allClassesNameToID dictionary with all available classes
  function getAllClasses() {
    allClassesNameToID = {};
    var xhr = new XMLHttpRequest();
    xhr.open('GET', "/get_all_classes", true); // responds with class_ids
    xhr.send();

    // once we have the user's classes
    xhr.onreadystatechange = function(e) {
      if (xhr.readyState == 4 && xhr.status == 200) {
        var response = JSON.parse(xhr.responseText);

        // populate the classes dictionary
        for (var i = 0; i < response.length; i++) {
          var classObj = response[i];
          if (classObj.class_id != "lounge_id") {
            allClassesNameToID[classObj.name] = classObj.class_id;
          }
        }
      }
      displayClasses();
    }
  }

  /* Helper functions */
  $scope.querySearch = function querySearch (query) {
    return query ? Object.keys(allClassesNameToID).filter(createFilterFor(query)) : [];
  }
  // filter function for search query to make it case-insensitive
  function createFilterFor(query) {
    return function filterFn(thisClass) {
        var uppercaseQuery = query.toUpperCase();
        pass = (thisClass.toUpperCase().indexOf(uppercaseQuery) === 0);
        thisClass = thisClass.replace(/\s+/g, '');
        pass = pass || (thisClass.toUpperCase().indexOf(uppercaseQuery) === 0);
        return pass;
    };
  }

  // returns name of class given class_id
  function getNameOfClass(class_id) {
    for (var name in allClassesNameToID) {
      if (allClassesNameToID[name] == class_id) {
        return name;
      }
    }
  }

  //token generator
  function generateToken(num) {
    var token = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    if (num && num > 0) {
      for(var i = 0; i < num; i++ ) {
        token += possible.charAt(Math.floor(Math.random() * possible.length));
      }
    }
    else {
      for(var i = 0; i < 10; i++ ) {
        token += possible.charAt(Math.floor(Math.random() * possible.length));
      }
    }
    return token;
  }

  $scope.whiteboardURL = function() {
    return "whiteboard.html#" + $rootScope.currRoomCallID;
  };

  //youtube id from url
  function youtubeIdFromUrl(url) {
    if (url.indexOf("youtube.com") != -1) {
      var youtubeDirtyId = url.split("/watch?v=")[1];
      //clean up the dirty id
      var youtubeCleanId = null;
      if (youtubeDirtyId) {
        youtubeCleanId = youtubeDirtyId.split("?")[0];
        youtubeCleanId = youtubeCleanId.split("&")[0];
      }
      return youtubeCleanId;
    }

    //youtube url format #2
    //  https://youtu.be/S-sJp1FfG7Q
    else if (url.indexOf("youtu.be") != -1) {
      var youtubeArr = url.split("/");
      if (youtubeArr) {
        var youtubeDirtyId = youtubeArr[youtubeArr.length-1]; 
        var youtubeCleanId = null;
        if (youtubeDirtyId) {
          youtubeCleanId = youtubeDirtyId.split("?")[0];
        }
        return youtubeCleanId;
      }
    }
    else {
      return null;
    }
  }

}]);

//helper directive for scrolling listener
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

//highlight filter 
myApp.filter('highlight', ["$sce", function($sce) {
  return function(text, phrase) {
    if (phrase) text = text.replace(new RegExp('('+phrase+')', 'gi'),
      '<span class="highlighted">$1</span>')
      return $sce.trustAsHtml(text)
  }
}]);
