// Initialize Firebase
var config = {
  apiKey: "AIzaSyB8eBxo5mqiVVskav5dCUQ1Hr_UQeiJAL4",
  authDomain: "studyspace-490cd.firebaseapp.com",
  databaseURL: "https://studyspace-490cd.firebaseio.com",
  storageBucket: "studyspace-490cd.appspot.com",
  messagingSenderId: "293916419475"
};
firebase.initializeApp(config);
var databaseRef = firebase.database().ref(); //root
var roomID = "cse110_asdf";
var chatDatabase = databaseRef.child("RoomMessages").child(roomID);
var firstLoad = true;
var user_id = getCookie("user_id");
var email = getCookie("email");

//Room app
var myApp = angular.module("roomApp", []);


/* Chat controller -------------------------------------*/

myApp.controller("ChatController", ["$scope", "$http", 
    function($scope, $http) {
      console.log("Hell yeah");

      $scope.sendChatMessage = function(chatInput) {
        if (chatInput) {
          console.log("Sending chat with: " + chatInput);
          var newChatMessage = new ChatMessage(user_id, email, chatInput, roomID, Date.now()/1000);
          console.log(newChatMessage);
          //chatDatabase.child(roomID).push().set(newChatMessage);
          $http.post("/send_room_message", newChatMessage);
        }
        else {
          console.log("chatInput is empty");
        }
      };


      //Firebase chat db listener
      chatDatabase.on("value", function(snapshot) {
        var snapshotValueObject = snapshot.val();
        if (snapshotValueObject) {
          var chatMessageList = Object.values(snapshotValueObject);
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
        var timeString = hour + ":" + timeSentDate.getMinutes() + " " + AMPM;

        var dateString = monthDayString + " " + timeString;
        return dateString;
      };

      function updateChatView(chatMessageList) {
        console.log("updated chat view");
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
        console.log("scrolling");
        var div = document.getElementById("chatMessageDiv");
        div.scrollTop = div.scrollHeight - div.clientHeight;
      }


    }]);

/*-----------------------------------------------------*/


/* Model ----------------------------------------------*/

function ChatMessage(userID, email, text, roomID, timeSent) {
  this.userID = userID;
  this.email = email;
  this.text = text;
  this.roomID = roomID;
  this.timeSent = timeSent;
}

/*-----------------------------------------------------*/

/* Cookie helper functions ---------------------------------------------------*/
/* Returns the cookie value for a key (null if no cookie with key exists) */
function getCookie(key) {
  var cookieName = key + "=";
  var cookieArray = document.cookie.split(";");
  console.log("All cookies: " + cookieArray);
  for (var i = 0; i < cookieArray.length; i++) {
    var cookie = cookieArray[i];
    while (cookie.charAt(0) == ' ') {
      cookie = cookie.substring(1);
    }
    if (cookie.indexOf(cookieName) == 0) {
      return cookie.split("=")[1];
    }
  }
  return null;
}

/* Stores a cookie with key-value at root (expires in 7 days) */
function storeCookie(key, value) {
  var expirationDate = new Date(Date.now() + 7*24*60*60*1000);
  document.cookie = key + "=" + value + ";expires=" + 
    expirationDate.toUTCString() + ";path=/";
}
/*----------------------------------------------------------------------------*/
