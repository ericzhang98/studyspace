//Room app -- firebase initialized already
var roomID = "cse110_asdf";
var chatDatabase = databaseRef.child("RoomMessages").child(roomID);
var myApp = angular.module("roomApp", []);
var chatMessageList = [];
var scrollUpList = [];


/* Chat controller -------------------------------------*/

myApp.controller("ChatController", ["$scope", "$http", 
    function($scope, $http) {
      console.log("Hell yeah");
      var chatInputBox = document.getElementById("chatInputBox");

      function uploadMessage(chatInput) {
        console.log("Sending chat with: " + chatInput);
        var newChatMessage = {text: chatInput, roomID: roomID, timeSent: Date.now()/1000};
        //chatDatabase.child(roomID).push().set(newChatMessage);
        $http.post("/send_room_message", newChatMessage);
        chatInputBox.value = "";
        $scope.chatInput = "";
        chatInputBox.focus();
      }

      $scope.sendChatMessage = function(chatInput) {
        if (chatInput) {
          uploadMessage(chatInput);
        }
      };

      $scope.keypress = function(e) {
        if (e.keyCode == 13) {
          if (chatInputBox.value) {
            uploadMessage(chatInputBox.value);
          }
        }
      }


      //Firebase chat db value listener
      /*
      chatDatabase.on("value", function(snapshot) {
        var snapshotValue = snapshot.val();
        if (snapshotValue) {
          //var chatMessageList = Object.values(snapshotValueObject); apparently
          //not supported by browser?!?!
          chatMessageList = Object.keys(snapshotValue).map(function(key) {
                return snapshotValue[key];
          });
          console.log(chatMessageList);
          updateChatView(chatMessageList);
        }
      });
      */

      chatDatabase.limitToLast(30).on("child_added", function(snapshot) {
        var snapshotValue = snapshot.val();
        chatMessageList.push(snapshotValue);
        updateChatView(chatMessageList);
      });

     function seeMoreMessages() {
       chatDatabase.limitToLast(40).once("value", function(snapshot) {
         var snapshotValue = snapshot.val();
         console.log(Object.keys(snapshotValue));
         console.log(snapshotValue);
       });
     } 

     seeMoreMessages();

      $scope.timeAgo= function(chatMessage) {
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

      function updateChatView(list) {
        //console.log("updated chat view");
        $scope.chatMessageList = list;
        safeApply();
        setTimeout(scrollDown, 1);
      }

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

      function scrollDown() {
        //console.log("scrolling");
        var div = document.getElementById("chatMessageDiv");
        div.scrollTop = div.scrollHeight - div.clientHeight;
      }
    
    }]);


/* Side bar  Start */
myApp.controller("classesController", function($scope) {

    $scope.class_names = {}; // class_id : class names
    $scope.class_rooms = {} // class_id : room_id

    $scope.rooms = {}       // room_id : room

    getClasses();

    

    $scope.joinRoomNG = function(room_id){
        joinRoom(room_id);
    };
    
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
        xhr.open('GET', "/get_class/" + class_id, true); // responds with the class's name and room_ids
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
});




/*-----------------------------------------------------*/


/* Model ----------------------------------------------*/

/*
function ChatMessage(name, email, text, roomID, timeSent) {
  this.name = name;
  this.email = email;
  this.text = text;
  this.roomID = roomID;
  this.timeSent = timeSent;
}
*/

/*-----------------------------------------------------*/
