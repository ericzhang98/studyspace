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
var chatDatabase = databaseRef.child("ChatDatabase");
var roomID = "roomID";
var firstLoad = true;

//Room app
var myApp = angular.module("roomApp", []);


/* Chat controller -------------------------------------*/

myApp.controller("ChatController", ["$scope", "$http", 
    function($scope, $http) {
      console.log("Hell yeah");

      $scope.sendChatMessage = function(chatInput) {
        if (chatInput) {
          console.log("Sending chat with: " + chatInput);
          var newChatMessage = new ChatMessage("test", chatInput, roomID, Date.now()/1000);
          console.log(newChatMessage);
          chatDatabase.child(roomID).push().set(newChatMessage);
        }
        else {
          console.log("chatInput is empty");
        }
      }


      //Firebase chat db listener
      chatDatabase.child(roomID).on("value", function(snapshot) {
        var snapshotValueObject = (snapshot.val());
        var chatMessageList = Object.values(snapshotValueObject);
        console.log(chatMessageList);
        updateChatView(chatMessageList);
      });

      function updateChatView(chatMessageList) {
        console.log("updated chat view");
        $scope.chatMessageList = chatMessageList;
        safeApply();
      }

      var safeApply = function(func) {
        var phase = $scope.$root.$$phase;
        if (phase != "$apply" && phase != "$digest") {
          if (func && (typeof(func) == "function")) {
            func();
          }
          $scope.$apply();
        }
        else {
          console.log("Already applying");
        }
      }

    }]);

/*-----------------------------------------------------*/


/* Model ----------------------------------------------*/

function ChatMessage(userID, text, roomID, timeSent) {
  this.userID = userID;
  this.text = text;
  this.roomID = roomID;
  this.timeSent = timeSent;
}

/*-----------------------------------------------------*/
