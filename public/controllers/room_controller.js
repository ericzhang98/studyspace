//Room app -- firebase initialized already
var chatDatabase = null;
var myApp = angular.module("roomApp", []);
var chatMessageList = [];
var scrollUpList = [];


/* Chat controller -------------------------------------*/

myApp.controller("ChatController", ["$scope", "$http", 
    function($scope, $http) {
      console.log("Hell yeah");
      var chatInputBox = document.getElementById("chatInputBox");

/************************* JOINING A CHATROOM ************************/
      
      // Listen for broadcast from classesController
      $scope.$on("room_change", function(event) {
        console.log("room changed to " + currRoomID);
        joinRoomChat();
      });

      // Join a room
      function joinRoomChat() {

        // turn off any pre-existing listeners
        if (chatDatabase != null) {
          chatDatabase.off();
        }

        // empty our message list in logic
        chatMessageList = [];

        // empty the message list in UI
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
      }

/*********************************************************************/
/************************** DISPLAYING CHATS *************************/
      
      // Set up listener for chat messages
      function startChatMessages() {
        chatDatabase.limitToLast(30).on("child_added", function(snapshot) {
          var snapshotValue = snapshot.val();
          chatMessageList.push(snapshotValue);
          updateChatView();
        });
      }

      // Update the chat view display
      function updateChatView() {
        //console.log("updated chat view");
        $scope.chatMessageList = chatMessageList;
        safeApply();
        setTimeout(scrollDown, 1);
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

      // View more messages
      function seeMoreMessages() {
        chatDatabase.limitToLast(40).once("value", function(snapshot) {
          var snapshotValue = snapshot.val();
          console.log(Object.keys(snapshotValue));
          console.log(snapshotValue);
        });
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

      function scrollDown() {
        //console.log("scrolling");
        var div = document.getElementById("chatMessageDiv");
        div.scrollTop = div.scrollHeight - div.clientHeight;
      }
    }]);

/*********************************************************************/

/* Side bar  Start */
myApp.controller("classesController", function($scope, $rootScope) {

/******************************* SETUP ******************************/
    
    // Scope variables
    $scope.class_names = {}; // class_id : class names
    $scope.class_rooms = {}  // class_id : room_id
    $scope.rooms = {}        // room_id : room

    // Initial call to pull data for user / classes / rooms
    getClasses();

/*********************************************************************/
/*************************** JOINING A ROOM **************************/

    // OnClick method that delegates to joinRoomCall and joinRoomChat
    $scope.joinRoom = function(room_id){

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

        // delegate to chat controller to join the room's chat
        $rootScope.$broadcast("room_change");
    };

/*********************************************************************/
/**************************** PULLING DATA ***************************/
    
    // - gets all class_ids for user
    // - delegates to getClass
    function getClasses() {
        console.log("Getting classes...")
        var xhr = new XMLHttpRequest();
        xhr.open('GET', "/get_my_classes", true); // responds with class_ids
        xhr.send();

        xhr.onreadystatechange = function(e) {
            if (xhr.readyState == 4 && xhr.status == 200) {
                var response = JSON.parse(xhr.responseText);
                console.log(response.class_ids);
                for (i = 0; i < response.class_ids.length; i++) {
                    getClass(response.class_ids[i]);
                }
            }
        }
    }

    // - gets class_name and class_rooms for specified class
    // - adds the class to the UI
    // - calls getRoom on all the rooms for specified class
    function getClass(class_id) {
        console.log("Getting class with id " + class_id);

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

                // store the class
                var response = JSON.parse(xhr.responseText);
                //update UI
                $scope.class_names[class_id] = response.name;
                //class_names[class_id] = response.name;

                console.log("class name is: " + response.name);

                //apply changes (needed)
                $scope.$apply();
            }
        }
    }

    // - respond to change in a class's rooms
    // - calls removeRoom/getRoom accordingly
    function onClassRoomsChange(class_id, updated_rooms) {

        console.log("rooms for class " + class_id + " are now " + updated_rooms);

        // get new rooms
        for (i = 0; i < updated_rooms.length; i++) {
          getRoom(class_id, updated_rooms[i]);
        }

        $scope.class_rooms[class_id] = updated_rooms;
    }

    // finds the room's data and adds it to the list of rooms
    function getRoom(class_id, room_id) {
        console.log("Getting room with id " + room_id);

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
});
