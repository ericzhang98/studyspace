//Room app -- firebase initialized already
var chatDatabase = null;
var myApp = angular.module("roomApp", []);

// list of message objects with: email, name, roomID, text, timeSent
var chatMessageList = [];
var CONCAT_TIME = 60; // 1 minute

/* Chat controller -------------------------------------*/

myApp.controller("RoomController", ["$scope", "$http", 
    function($scope, $http) {
      console.log("Hell yeah");

/*-------------------------------------------------------------------*/
/****************************** CHAT ROOM ****************************/
/*-------------------------------------------------------------------*/

      var div = document.getElementById("chatMessageDiv");
      var chatInputBox = document.getElementById("chatInputBox");
      var lastKey = null;
      var scrollLock = false;

/************************* JOINING A CHATROOM ************************/

      // Join a room's chat
      function joinRoomChat() {

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
        chatDatabase = databaseRef.child("RoomMessages").child(currRoomID);
        startChatMessages();
      }

/*********************************************************************/
/*************************** SENDING CHATS ***************************/
      
      // Send chat when send button is pressed
      $scope.sendChatMessage = function(chatInput) {
        if (chatInput) {
          uploadMessage(chatInput);
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

      // Upload message to the database
      function uploadMessage(chatInput) {

        // If we're in a valid room
        if (currRoomID) {

          console.log("Sending chat with: " + chatInput);

          // Create the message and pass it on to the server
          var newChatMessage = {text: chatInput, roomID: currRoomID, timeSent: Date.now()/1000};
          $http.post("/send_room_message", newChatMessage);
        }

        // Reset the local chat UI/logic
        chatInputBox.value = "";
        $scope.chatInput = "";
        chatInputBox.focus();
        scrollDown();
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
          if(div.scrollTop + 200 >= (div.scrollHeight - div.clientHeight)) {
            shouldScroll = true;
          }
          updateChatView();
          if (shouldScroll) {
            setTimeout(scrollDown, 1);
          }
        });
      }

      // Update the chat view display
      function updateChatView() {
        concatenateMessages();
        $scope.chatMessageList = chatMessageList;
        safeApply();
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

          // otherwise, increment i
          i++;
        }
      }

      // Safely apply UI changes
      function safeApply(func) {
        var phase = $scope.$root.$$phase;
        if (phase != "$apply" && phase != "$digest") {
          if (func && (typeof(func) == "function")) {
            $scope.$apply(func);
          }
          $scope.$apply();
        }
        else {
          console.log("Already applying");
        }
      }

      // Scroll event listener -- see more messages if scroll within 30px of top
      $scope.scrollevent = function() {
        //console.log("Scroll top: " + div.scrollTop);
        if(div.scrollTop <= 30) {
          //don't call seeMore if still processing past one
          if (!scrollLock) { 
            seeMoreMessages();
          }
        }
      }

      // View more messages -- queries last number of msgs from Firebase and
      // updates chat view, then scrolls to correct place to maintain position
      function seeMoreMessages() {
        //check if a lastKey is ready, signifying that og msgs have finished
        if (lastKey) {
          console.log("see more");
          scrollLock = true; //prevent any more seeMoreMessages calls until current finishes
          var messagesSoFar = chatMessageList.length;
          var messagesToAdd = 20;
          //query db for past number of messages
          chatDatabase.limitToLast(messagesToAdd+1).orderByKey().endAt(lastKey)
            .once("value", function(snapshot) {
            var snapshotValue = snapshot.val();
            if (snapshotValue) {
              lastKey = Object.keys(snapshotValue)[0];
              console.log("pulled more messages + 1: " + (Object.keys(snapshotValue).length));
              //var messageArray = Object.values(snapshotValueObject); apparently
              //not supported by browser?!?!
              var moreMessagesArray = Object.keys(snapshotValue).map(function(key) {
                    return snapshotValue[key];
              });
              //var firstPart = messageArray.splice(0, messagesToAdd);
              moreMessagesArray.pop(); //remove extra messsage b/c lastKey inclusive
              chatMessageList = moreMessagesArray.concat(chatMessageList); //combine with og msgs

              //keep track of height diff, update view, and then scroll by diff
              var previousHeight = div.scrollHeight;
              var previousPosition = div.scrollTop;
              console.log("prev height: " + (previousHeight));
              console.log("prev pos: " + (previousPosition));
              updateChatView();
              console.log("curr height: " + (div.scrollHeight));
              console.log("Scroll down by: " + (div.scrollHeight - previousHeight));
              div.scrollTop = previousPosition + (div.scrollHeight - previousHeight);
              scrollLock = false;
            }
          });
        }
      }

      // Calculate time since message was sent
      $scope.timeAgo = function(chatMessage) {
        var timeSentDate = new Date(chatMessage.timeSent * 1000);
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
        console.log("scroll completely down");
        div.scrollTop = div.scrollHeight - div.clientHeight;
      }

/*********************************************************************/

/*-------------------------------------------------------------------*/
/***************************** CLASSES BAR ***************************/
/*-------------------------------------------------------------------*/

/******************************* SETUP ******************************/

    // Scope variables
    $scope.my_class_ids = [];
    $scope.class_names = {}; // class_id : class names
    $scope.class_rooms = {}  // class_id : room_id
    $scope.rooms = {}        // room_id : room

    // Initial call to pull data for user / classes / rooms
    getClasses();

/*********************************************************************/
/********************** CREATING AND JOINING ROOMS *******************/

    // Reads input from create-room-modal, creates room, and joins room
    $scope.addRoom = function() {

      // Grab modal values
      var class_id = $('#class_id input:radio:checked').val();
      // style choice: all room names be lower case only
      var room_name = (document.getElementById('room_name').value).toLowerCase();
      var is_lecture = false;

      // if class_id is null do nothing
      if (class_id == null) {
        console.log("no class selected");
        // TODO: error message
        return;
      }
      // if room_name is empty do nothing
      if (room_name.length == 1) {
        console.log("room name too short")
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
        room_name + "/" + is_lecture, true);
      xhr.send();

      // Once room has been created
      xhr.onreadystatechange = function(e) {
        // room has been created
        if (xhr.readyState == 4 && xhr.status == 200) {
          var response = JSON.parse(xhr.responseText);

          // join the room
          $scope.joinRoom(response.room_id, class_id, room_name);
        }
      }
    }

    // OnClick method that delegates to joinRoomCall and joinRoomChat
    // room_name is passed in when we create the room (room info not yet pulled)
    $scope.joinRoom = function(room_id, class_id, room_name = null) {

        // if we're already in this room, do nothing
        if (currRoomID == room_id) {
          return;
        }

        // leave previous room
        leaveRoom();

        // set currRoomID for both joinRoomCall and joinRoomChat
        currRoomID = room_id;

        // delegate to call.js to join the room's call
        joinRoomCall(room_id);

        // set scope variables
        $scope.currRoomName = room_name? room_name : $scope.rooms[currRoomID].name;
        $scope.currClassName = $scope.class_names[class_id] + " - ";
        $scope.currClassID = class_id;

        // delegate to chat controller to join the room's chat
        //$scope.$broadcast("room_change");
        joinRoomChat();
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

        // add listener for class rooms
        classRoomsDatabase.child(class_id).on("value", function(snapshot) {
          if (snapshot.val()) {
            onClassRoomsChange(class_id, Object.values(snapshot.val()));
          }
        });

        // get class name
        var xhr = new XMLHttpRequest();
        xhr.open('GET', "/get_class/" + class_id, true); // res with the class's name and room_ids
        xhr.send();

        xhr.onreadystatechange = function(e) {
            if (xhr.readyState == 4 && xhr.status == 200) {

                // store the class name
                var response = JSON.parse(xhr.responseText);
                $scope.class_names[class_id] = response.name.toLowerCase();

                // update UI
                $scope.$apply();
            }
        }
    }

    // - respond to change in a class's rooms
    // - calls removeRoom/getRoom accordingly
    function onClassRoomsChange(class_id, updated_rooms) {

        // get new rooms
        for (i = 0; i < updated_rooms.length; i++) {
          getRoom(class_id, updated_rooms[i]);
        }

        $scope.class_rooms[class_id] = updated_rooms;
    }

    // finds the room's data and adds it to the list of rooms
    function getRoom(class_id, room_id) {

        // add listener for room info
        roomsDatabase.child(room_id).once("value", function(snapshot) {

            var room = snapshot.val();

            if (room) {

                // store the room
                $scope.rooms[room_id] = 
                    new Room(room_id, room.name, room.host_id, room.class_id,
                    room.is_lecture, room.has_tutor, room.users);

                // update the UI
                $scope.$apply();
            }
        });
    }

/*********************************************************************/
}]);

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
})
