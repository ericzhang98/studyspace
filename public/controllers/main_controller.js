//Room app -- firebase must be initialized already
var chatDatabase = null;
var typingDatabase = null;
var myApp = angular.module("mainApp", ["ngMaterial"]);

// list of message objects with: email, name, roomID, text, timeSent
var chatMessageList = [];
var CONCAT_TIME = 60*1000; // 1 minute
var currPing = null;
var USER_PING_PERIOD = 15*1000;

/* Main controller -------------------------------------*/

myApp.controller("MainController", ["$scope", "$http", "$timeout", "classesTransport", "$rootScope",
function($scope, $http, $timeout, classesTransport, $rootScope) {
  console.log("Hell yeah");

  // general vars
  $scope.myID = getSignedCookie("user_id");
  $scope.currRoomCallID = null;
  $scope.currRoomChatID = null;

  $scope.myName = getSignedCookie("name");

  /*-------------------------------------------------------------------*/
  /****************************** CHAT ROOM ****************************/
  /*-------------------------------------------------------------------*/

  var div = document.getElementById("chat-message-pane");
  var chatInputBox = document.getElementById("chatInputBox");
  var lastKey = null;
  var scrollLock = false;
  var currTyping = [];
  var isTyping = false;

  /************************* JOINING A CHATROOM ************************/

  // Join a room's chat
  function joinRoomChat(room_id) {

    if ($scope.currRoomChatID != room_id) {
      $scope.currRoomChatID = room_id;

      // turn off any pre-existing listeners and control vars
      if (chatDatabase != null) {
        chatDatabase.off();
      }

      lastKey = null;
      scrollLock = false;

      // empty our message list in logic and UI
      chatMessageList = [];
      updateChatView();

      // set up and start new listener
      chatDatabase = databaseRef.child("RoomMessages").child($scope.currRoomChatID);
      startChatMessages();

      // empty typing list and listen to who's typing
      currTyping = [];
      if (typingDatabase != null) {
        typingDatabase.off();
      }
      startCurrTyping();
    }
  }
  /*********************************************************************/
  /*************************** SENDING CHATS ***************************/

  // Send chat when send button is pressed
  $scope.sendChatMessage = function(chatInput) {
    if (chatInput) {

      // easter eggs
      if (secretCommands.indexOf(chatInput) != -1) {

        // do the command, and if it returns a message
        // then upload it
        var msg = doCommand(chatInput)
        if (msg) {
          uploadMessage(msg);
        }

        else {
          // reset fields     
          chatInputBox.value = "";
          $scope.chatInput = "";
          chatInputBox.focus();
        }
      }

      // regular message
      else {
        uploadMessage(chatInput);
      }
    }
  };

  // Send chat when enter key is pressed
  $scope.keypress = function(e) {
    if (e.keyCode == 13) {
      if (chatInputBox.value) {
        uploadMessage(chatInputBox.value);
      }
    }
  }

  // Send chat when enter key is pressed
  $scope.keypress = function(e) {
    setTimeout(function() {
      if (chatInputBox.value) {
        if (!isTyping) {
          console.log("hi");
          $http.get("/typing/true/" + $scope.currRoomChatID);
          isTyping = true;
        }
      }
      else {
        if (isTyping) {
          console.log("nope");
          $http.get("/typing/false/" + $scope.currRoomChatID);
          isTyping = false;
        }
      }
    }, 10);
  }

  // Listen to RoomTyping
  function startCurrTyping() {
    var typingDatabase = databaseRef.child("RoomTyping").child($scope.currRoomChatID).on("value", function(snapshot) {
      var val = snapshot.val();
      if (val) {
        currTyping = Object.keys(val);
        updateCurrTyping();
      }
      else {
        currTyping = [];
        $scope.currTyping = [];
      }
      $scope.$apply();
    });
  }

  function updateCurrTyping() {
    for (var i = currTyping.length-1; i >= 0; i--) {
      console.log($scope.rooms[$scope.currRoomChatID].users);
      if (!$scope.rooms[$scope.currRoomChatID].users.includes(currTyping[i])) {
        currTyping.splice(i,1);
      }
    }
    var names = []
    for (var i = 0; i < currTyping.length; i++) {
    	if (currTyping[i] != myID) {
      	names.push($scope.users[currTyping[i]].name);
    	}
    }
    $scope.currTyping = names;
  }

  // Upload message to the database
  function uploadMessage(chatInput) {

    // If we're in a valid room
    if ($scope.currRoomChatID) {

      console.log("Sending chat with: " + chatInput);

      // Create the message and pass it on to the server
      var newChatMessage = {text: chatInput, roomID: $scope.currRoomChatID, timeSent: Date.now()};
      $http.post("/send_room_message", newChatMessage);
    }

    // Reset the local chat UI/logic
    chatInputBox.value = "";
    $scope.chatInput = "";
    chatInputBox.focus();
  }

  $scope.muteBtnClass = ['glyphicon', 'glyphicon-volume-up'];
  // Toggle the mute button image
  $scope.toggleMic = function() {
    console.log("toggling mute image");
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
  /************************** DISPLAYING CHATS *************************/

  // Set up listener for chat messages
  function startChatMessages() {
    chatDatabase.limitToLast(50).on("child_added", function(snapshot) {
      var snapshotValue = snapshot.val();
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
    });
  }

  // Update the chat view display
  function updateChatView(func) {
    concatenateMessages();
    $scope.chatMessageList = chatMessageList;
    safeApply(func);
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

  // Safely apply UI changes
  function safeApply(func) {
    var phase = $scope.$root.$$phase;
    if (phase != "$apply" && phase != "$digest") {
      if (func && (typeof(func) == "function")) {
        $scope.$apply(func);
      }
      else {
        $scope.$apply();
      }
    }
    else {
      console.log("Already applying");
      if (func && (typeof(func) == "function")) {
        func();
      }
    }
  }

  // Scroll event listener -- see more messages if scroll within 200px of top
  var lastScroll = 0;
  $scope.scrollevent = function() {
    //console.log("Scroll top: " + div.scrollTop);
    //console.log("CURRENT HEIGHT: " + div.scrollHeight);
    var currentScroll = div.scrollTop;
    if(currentScroll <= 200 && currentScroll < lastScroll) {
      //don't call seeMore if still processing past one
      if (!scrollLock) { 
        seeMoreMessages();
      }
    }
    lastScroll = currentScroll;
  }

  // View more messages -- queries last number of msgs from Firebase and
  // updates chat view, then scrolls to correct place to maintain position
  function seeMoreMessages() {
    //check if a lastKey is ready, signifying that og msgs have finished
    if (lastKey) {
      console.log("see more");
      //show loading UI element
      document.getElementById("loading").removeAttribute("hidden");
      scrollLock = true; //prevent any more seeMoreMessages calls until current finishes
      var messagesSoFar = chatMessageList.length;
      var messagesToAdd = 50;
      //query db for past number of messages
      chatDatabase.limitToLast(messagesToAdd+1).orderByKey().endAt(lastKey)
        .once("value", function(snapshot) {
        var snapshotValue = snapshot.val();
        if (snapshotValue) {
          lastKey = Object.keys(snapshotValue)[0];
          console.log("pulled more messages + 1: " + (Object.keys(snapshotValue).length));
          //var messageArray = Object.values(snapshotValueObject)
          var moreMessagesArray = Object.keys(snapshotValue).map(function(key) {
            return snapshotValue[key];
          });
          moreMessagesArray.pop(); //remove extra messsage b/c lastKey inclusive

          if (moreMessagesArray.length > 0) {
            chatMessageList = moreMessagesArray.concat(chatMessageList); //combine with og msgs
          }
          else {
            lastKey = null; //otherwise don't pull anymore
          }

          //keep track of height diff, update view, and then scroll by diff
          var previousHeight = div.scrollHeight;
          var previousPosition = div.scrollTop;
          //console.log("prev height: " + (previousHeight));
          //console.log("prev pos: " + (previousPosition));
          updateChatView();
          //setTimeout(function(){
          //$timeout(function(){
          var currHeight = div.scrollHeight;
          //console.log("curr height: " + currHeight);
          //console.log("Scroll down by: " + (currHeight - previousHeight));
          div.scrollTop = previousPosition + (div.scrollHeight - previousHeight);
          scrollLock = false;
          //hide loading UI element
          document.getElementById("loading").setAttribute("hidden", null);
          //});
          //}, 20);
        }
      });
    }
  }

  // Calculate time since message was sent
  $scope.timeAgo = function(chatMessage) {
    var timeSentDate = new Date(chatMessage.timeSent);
    var monthDayString = (timeSentDate.getMonth()+1) + "/" + timeSentDate.getDate();
    var hour = timeSentDate.getHours();
    var AMPM = "AM";
    if (hour > 12) {
      hour -= 12;
      AMPM = "PM";
    }
    else if (hour == 0) {
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

  /*-------------------------------------------------------------------*/
  /***************************** CLASSES BAR ***************************/
  /*-------------------------------------------------------------------*/

  /******************************* SETUP ******************************/

  // Scope variables
  $scope.my_class_ids = [];
  $scope.classes = {}      // class_id : class
  $scope.class_rooms = {}  // class_id : list of room_ids
  $scope.rooms = {}        // room_id : room
  $scope.users = {}        // user_id : user
  $scope.muted_user_ids = [];

  $scope.refreshAddClass = function() {
    classesTransport.setClasses($scope.my_class_ids);
    $rootScope.$broadcast("refresh"); //temp
    console.log("refresh");
  };

  // Initial call to pull data for user / classes / rooms
  getClasses();

  /*********************************************************************/
  /*************************** ROOM INTERACTION ************************/

  $scope.createRoom = function(room_id) {
    console.log('create room');
    $("#modal-create-room").fadeIn(100);
    setTimeout(function() {
      $("#create-room").removeClass("hide");
      $("#create-room").addClass("fadeInBack");
    }, 100);
  }

  // Reads input from create-room-modal, creates room, and joins room
  $scope.addRoom = function() {

    // Grab modal values
    var class_id = $('input:radio[name=class_id_radio]:checked').val();

    // style choice: all room names be lower case only
    var room_name = (document.getElementById('room_name').value).toLowerCase();
    var is_lecture = document.getElementById('lecture-checkbox').checked;
    var time_created = Date.now();

    // if class_id is null do nothing
    if (class_id == null) {
      console.log("no class selected");
      // TODO: error message
      return;
    }

    // if room_name is empty do nothing
    if (room_name.length == 0) {
      console.log("room name must be between 1 and 28 characters");
      // TODO: error message
      return;
    }

    // Close the modal
    closeModal("#modal-create-room", "#create-room");

    // Send out addRoom request
    console.log("adding room with class_id: " + class_id + 
                ", room_name: " + room_name);
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
          console.log(response.error);
          return;
        }

        if (response.room_id) {

          // join the room
          $scope.joinRoom(response.room_id, response.class_id);
        }
      }
    }
  }

  // OnClick method that delegates to joinRoomCall and joinRoomChat
  // room_name is passed in when we create the room (room info not yet pulled)
  $scope.joinRoom = function(room_id, class_id) {

    // if we're not already in this room's call
    if ($scope.currRoomCallID != room_id) {

      // leave previous room
      leaveRoom($scope.currRoomCallID);

      // update currRoomCallID
      $scope.currRoomCallID = room_id;

      // join the call
      joinRoomCall($scope.currRoomCallID);

      // open up the sidebar panel with this new room
      adjustSidebarToggle(class_id);

      //setup activity ping
      //the client can mess around with this, we need to handle kicking the
      //client somehow if they stop pinging, it's fine if they can still
      //listen in on data, but other users must always be aware of prescence
      if (!currPing) {
        pingUserActivity(true);
      }
    }

    // join this room's chat
    joinRoomChat(room_id);

  };

  $scope.leaveRoom = function() {

    leaveRoom($scope.currRoomCallID);

    $scope.currRoomCallID = null;
    $scope.currRoomChatID = null;
  }

  function pingUserActivity(constant) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/ping", true);
    xhr.send();
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
        //console.log("class with id " + my_class_id + " being set to visible");
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

  /*********************************************************************/
  /**************************** PULLING DATA ***************************/

  // - gets all class_ids for user
  // - delegates to getClass
  function getClasses() {
    console.log("Getting class ids...")
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

        $scope.my_class_ids.push("lounge_id");

        console.log("Getting classes info...")

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
        console.log(response);

        // update UI
        $scope.$apply();

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
      $scope.$apply();
    }

    // detach listeners for removed rooms
    for (i = 0; i < curr_rooms.length; i++) {
      // if this room is not in the new rooms, detach listener
      if (updated_rooms.indexOf(curr_rooms[i]) == -1) {
        console.log("detaching listener for room with id " + curr_rooms[i]);
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

        // update the room
        $scope.rooms[room_id] = new Room(room_id, room.name, room.host_id, room.class_id, 
                                         room.is_lecture, room.users? Object.values(room.users) : [], room.host_name ? room.host_name : "Unknown host");

        // are there tutors in here?
        detectTutors($scope.rooms[room_id]);

        // how many people are studying for this class now?
        setNumUsers($scope.rooms[room_id].class_id);

        // update the UI
        console.log("applying in get room, room name is : " + $scope.rooms[room_id].name);

        // get room users
        updateRoomUsers($scope.rooms[room_id]);

        // update currTyping ppl
        updateCurrTyping();

        $scope.$apply(function() {/*
var item = (document.getElementById(room_id));
if (item.scrollWidth >  item.width) {
console.log("overflow for " + room_id + ", scroll width: " + item.scrollWidth + 
", innerWidth: " + item.width);
} else {
console.log("no overflow for " + room_id + ", scroll width: " + item.scrollWidth + 
", innerWidth: " + item.width);
}*/
        });

      }
    });
  }


  // Set the number of total users studying for a class at the moment
  function setNumUsers(class_id) {
    //console.log("setting num users for " + class_id);
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

  /*********************************************************************/
  /**************************** BUDDY SYSTEM ***************************/

  console.log("buddies");
  var getBuddyRequests = function(onResponseReceived){
    var data = {"sent_to_id":"user_id inserted"};
    console.log(data);
    $http.post('/buddy_requests', data).then(function(response){
      //console.log(response.data);
      return onResponseReceived(response.data);
    });
  };

  var getBuddies = function(onResponseReceived){
    var data = {"user_one_id":"user_id goes here"};
    $http.post('/get_added_buddies', data).then(function(response){
      if (response.data[0]) {
        return onResponseReceived(response.data[0]['buddies']);
      }
    });
  };

  var userExists = function(name, onResponseReceived){  
    $http.post('/buddy_existing_user', $scope.friend).then(function(response){
      //console.log(response.data + "RESPONSE");
      return onResponseReceived(response.data);
    });
  };

  var buddyRequestExists = function(friend_id, onResponseReceived){
    var data = {"user_id":"user_id placed here",
                "friend_id":String(friend_id)};
    $http.post('/buddy_existing_request', data).then(function(response){
      return onResponseReceived(response.data);
    });   
  };

  var friendshipExists = function(friend_id, friend_name, onResponseReceived){
    var data = {"user_id":"user_id inserted",
                "friend_id":String(friend_id),
                "friend_name":String(friend_name)};
    $http.post('/buddies_already', data).then(function(response){
      return onResponseReceived(response.data);
    });   
  }  
  var deleteBuddy = function(id, onResponseReceived){
    console.log(id);
    $http.delete('/reject_buddy/' + id).then(function(response){
      getBuddyRequests(function(response){ 
        $scope.buddies_list = response;
      });
    });
  };
  var acceptBuddy = function(data, onResponseReceived){
    console.log(data);
    $http.post('/accept_buddy', data).then(function(response){
      return onResponseReceived(response.data);
    });      
  }

  getBuddyRequests(function(response){ 
    console.log(response);
    $scope.buddies_list = response; 
  });

  getBuddies(function(response){ 
    $scope.added_buddies_list = response;
  });

  $scope.sendRequest = function(){
    console.log("request");
    userExists($scope.friend.name, function(response){
      console.log(response);
      if(response){
        var friend_id = response.user_id;
        var friend_name = response.name;
        console.log(friend_id);
        buddyRequestExists(friend_id, function(requestExists){ 

          console.log("BUDDY REQUEST EXISTS? " + requestExists);
          console.log(requestExists);
          if(!requestExists || requestExists.length == 0){ 
            console.log("ARE WE FRIENDS ALREADY");          
            friendshipExists(friend_id, friend_name, function(friendship){ 
              console.log("FRIENDSHIP? " + friendship);
              if(!friendship || friendship.length == 0){
                console.log("Adding friend");
                var data = {"sent_from_id":"Place user_id here", 
                            "sent_from_name": "user_name",
                            "sent_to_id":String(friend_id),
                            "sent_to_name": String(friend_name)};
                $http.post('/send_buddy_request', data).then(function(response){
                  console.log(response.data);
                });  
              }
            });
          }
        });
      }
    });
  };

  $scope.rejectBuddyRequest = function(id){
    console.log(id);
    deleteBuddy(id, function(response){});
  };

  $scope.acceptBuddy = function(requestInfo){
    //console.log(requestInfo);
    var data = {"user_one_id":String(requestInfo.sent_to_id),
                "user_one_name":String(requestInfo.sent_to_name),
                "user_two_id":String(requestInfo.sent_from_id),
                "user_two_name":String(requestInfo.sent_from_name)};

    acceptBuddy(data, function(response){
      deleteBuddy(requestInfo._id, function(response){});
    });

    getBuddies(function(response){
      $scope.added_buddies_list = response;
    });
  };

  $scope.deleteFriend = function(id){
    console.log(id);
    $http.delete('/remove_buddy/' + id).then(function(response){
      getBuddies(function(response){ //TODO:Change this to get buddies for uid
        $scope.added_buddies_list = response;
      });
    });    
  };

  $scope.openDM = function(other_user_id, other_user_name){

    // the room_id of DM's between id's "aaa" and "bbb"
    // will be "bbbaaa"
    var dm_room_id;

    if (myID > other_user_id){     
      dm_room_id = myID + other_user_id;
    }

    else {
      dm_room_id = other_user_id + myID;
    }    

    console.log("entering dm room with id: " + dm_room_id);

    // set up dummy class/room
    $scope.classes["dm_class_id"] = {
      "name" : ""
    }
    $scope.rooms[dm_room_id] = {
      "name" : other_user_name,
      "class_id" : "dm_class_id"
    }

    // join the chat
    joinRoomChat(dm_room_id);
  };

  // getting the list of users in this room
  function updateRoomUsers(room) {
    console.log("this is a room " + room);
    if (room) {
      console.log("getting new list of users for room: " + room.room_id);
      console.log($scope.rooms);
      for (var i = 0; i < room.users.length; i++) {
        if (!(room.users[i] in $scope.users)) {
          var id = room.users[i];
          $http.get('/get_room_user/' + room.users[i]).then(function(response) {
            $scope.users[response.data.id] = response.data;
            console.log("user info pulled: " + response.data.name);
          });
      	}
      }
    }
  }

  /*********************************************************************/
  /**************************** BLOCK SYSTEM ***************************/

  var blockedUsers = {};

  var getIdFromName = function(name, onResponseReceived){
    var email = {"email": String(name)};
    console.log(email);
    $http.post('/get_Id_From_Name', email).then(function(response){
      onResponseReceived(response.data);
    });    
  }
  var refresh = function(){
    $http.get('/get_blocked_users').then(function(response){
      $scope.block_user_list = response.data;
      console.log(response.data);
      console.log(response.data.length);
      console.log(response.data[0]);
      if(!(response.data[0])){
        return;
      }
      blockedUsers['user_id'] = response.data[0]['blocked_user_id'];
      blockedUsers['blocked_user_list'] = [];
      for (var i = 0; i < response.data.length; i++){
        console.log("1");
        var obj = response.data[i];
        blockedUsers['blocked_user_list'].push(obj['blocked_user_id']);
      }
    });
  }
  var addBlock = function(blocked_user_id, blocked_user_email, onResponseReceived){
    var data = {
      "blocked_user_id": String(blocked_user_id),
      "blocked_user_email": blocked_user_email
    }; 
    console.log("ADD");
    $http.post('/add_blocked_user', data).then(function(response){
      onResponseReceived(response.data);
    });
  };
  $scope.unblock = function(id){

    console.log(id);
    $http.delete('/remove_block/' + id).then(function(response){
      refresh();
    });
  }
  refresh();
  $scope.blockUser = function(){
    getIdFromName($scope.block_user.name, function(response){
      console.log(response);
      if(response){
        console.log(response.user_id);
        addBlock(response.user_id, response.email, function(response){
          console.log("XX");
          console.log(response);
          refresh();
        });
      }
    });
  }
}]);

myApp.controller("AddClassController", ["$scope", "$http", "classesTransport", "$rootScope",
function ($scope, $http, classesTransport, $rootScope) {
  // Global Variables
  var allClassesNameToID = {}; // name: class_id dictionary for all available classes
  getAllClasses();

  var userClasses = []; // class id's that are going to be displayed
  $scope.currClasses = []; //what's displayed
  //$scope.currClasses = classesTransport.userClasses;

  $rootScope.$on("refresh", function(){getUserClasses()});
  /*
  $scope.userClasses = classesTransport.userClasses;
  $scope.$watch("userClasses", function() {
    return classesTransport.userClasses;
  }, function(data) {
    console.log("CHANGED");
    console.log(data);
  });
  */
  /*
  $scope.$watch("classesTransport.userClasses", 
  function(data) {
    console.log("CHANGED");
    console.log(data);
    //displayClasses();
  });
  */

  $scope.processSelection = function processSelection() {
    //don't trigger on null (when the selected item changes from a good one)
    if ($scope.selectedItem) {
      var class_name = $scope.selectedItem;
      if (verifyClass(class_name)) {
        var class_id = allClassesNameToID[class_name];
        // Make sure the user isn't already in the class
        if($.inArray(class_id, userClasses) == -1) {
            addClass(class_id);
        } else {
          console.log("already in class with name " + class_name+ " and id " + class_id);
        }
      }
      else {
        console.log("could not verify class with name " + class_name + " and id " + class_id);
      }
    }
  }

  function verifyClass(className) {
    //console.log("verifying " + className);
    var returnVal = $.inArray(className, Object.keys(allClassesNameToID).map(function(x){ return x;}));
    return returnVal > -1;
  }

  /* Add, remove, and save */
  function addClass(class_id) {
    console.log("UI Adding " + class_id);
    userClasses.push(class_id);
    displayClasses();
    $scope.searchText = "";
  }

  $scope.removeClass = function removeClass(class_id) {
    console.log("UI Removing " + class_id);
    var index = $.inArray(class_id, userClasses);
    if(index == -1) {
      console.log("Cannot remove class, class_id" + class_id+ " not found!")
    }
    userClasses.splice(index, 1);
    displayClasses();
  }

  $scope.saveChanges = function saveChanges() {
    $http.post('/enroll', {class_ids: userClasses});
    closeModal("#modal-add-class", "#add-class");
  }

  // filter function for search query
  function createFilterFor(query) {
    var uppercaseQuery = query.toUpperCase();
    return function filterFn(thisClass) {
      return (thisClass.toUpperCase().indexOf(uppercaseQuery) === 0);
    };
  }

  // updates UI to display currently enrolled classes
  function displayClasses() {
    console.log("DISPLAY CLASSES");
    var classObjects = [];
    for (var i = 0; i < userClasses.length; i++) {
      classObjects.push({class_id: userClasses[i], class_name: getNameOfClass(userClasses[i])});
    }
    $scope.currClasses = classObjects;
    console.log($scope.currClasses);
    safeApply();
  }

  // returns name of class given class_id
  function getNameOfClass(class_id) {
    for (var name in allClassesNameToID) {
      if (allClassesNameToID[name] == class_id) {
        return name;
      }
    }
  }

  // populates the allClassesNameToID dictionary with all available classes
  function getAllClasses() {
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
          allClassesNameToID[classObj.name] = classObj.class_id;
        }

        displayClasses();
        // get my classes
        getUserClasses();
      }
    }
  }

  // populates userClasses list with ids of all classes they are enrolled in
  // calls displayClasses afterward to reflect changes
  function getUserClasses() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', "/get_my_classes", true); // responds with class_ids
    xhr.send();

    // once we have the user's classes
    xhr.onreadystatechange = function(e) {
      if (xhr.readyState == 4 && xhr.status == 200) {
        var response = JSON.parse(xhr.responseText);
        if (response.class_ids != null) {

          // set userClasses to equal this list
          userClasses = response.class_ids;

          // update the UI
          displayClasses();
        }
      }
    }
  }

  $scope.querySearch = function querySearch (query) {
    return query ? Object.keys(allClassesNameToID).filter(createFilterFor(query)) : [];
  }

  function safeApply(func) {
    var phase = $scope.$root.$$phase;
    if (phase != "$apply" && phase != "$digest") {
      if (func && (typeof(func) == "function")) {
        $scope.$apply(func);
      }
      else {
        $scope.$apply();
      }
    }
    else {
      console.log("Already applying");
      if (func && (typeof(func) == "function")) {
        func();
      }
    }
  }

}]);

//helper service for communicating between MainController and AddClassController
myApp.factory("classesTransport", function() {
  var classesTransport = {};
  userClasses = []; //list of class ids
  classesTransport.setClasses = function(classes) { //set list of class ids
    while(userClasses.length > 0) {userClasses.pop();}
    for (var i = 0; i < classes.length; i++) {userClasses.push(classes[i]);}
  };
  return classesTransport;
});

//helper directive for scrolling listener
myApp.directive("scroll", function ($window) {
  return {
    scope: {
      scrollEvent: '&'
    },
    link : function(scope, element, attrs) {
      $("#"+attrs.id).scroll(function($e) { scope.scrollEvent != null ?  scope.scrollEvent()($e) : null })
    }
  }
});
