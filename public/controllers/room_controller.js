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
