// Initialize Firebase
var databaseRef = firebase.database().ref(); //root
var chatDatabase = databaseRef.child("RoomMessages").child(currRoomID);

//Room app
var myApp = angular.module("roomApp", []);


/* Chat controller -------------------------------------*/

myApp.controller("ChatController", ["$scope", "$http", 
    function($scope, $http) {
      console.log("Hell yeah");
      var chatInputBox = document.getElementById("chatInputBox");

      function uploadMessage(chatInput) {
        console.log("Sending chat with: " + chatInput);
        //var newChatMessage = new ChatMessage(name, email, chatInput, roomID, Date.now()/1000);
        var newChatMessage = {text: chatInput, roomID: currRoomID, timeSent: Date.now()/1000};
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


      //Firebase chat db listener
      chatDatabase.on("value", function(snapshot) {
        var snapshotValueObject = snapshot.val();
        if (snapshotValueObject) {
          //var chatMessageList = Object.values(snapshotValueObject); apparently
          //not supported by browser?!?!
          var chatMessageList = Object.keys(snapshotValueObject).map(function(key) {
                return snapshotValueObject[key];
          });
          console.log(chatMessageList);
          updateChatView(chatMessageList);
        }
      });

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

      function updateChatView(chatMessageList) {
        //console.log("updated chat view");
        $scope.chatMessageList = chatMessageList;
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
