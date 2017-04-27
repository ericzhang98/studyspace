myApp.controller("RoomController", ["$scope", "$rootScope", "$http", "$timeout", "$window",
function($scope, $rootScope, $http, $timeout, $window) {
/*-------------------------------------------------------------------*/
  /****************************** CHAT ROOM ****************************/
  /*-------------------------------------------------------------------*/
  var chatDatabase = null;
  var typingDatabase = null;
  var chatPinnedDatabase = null
  var CONCAT_TIME = 60*1000; // 1 minute


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

  $scope.chatter = new Chatter($rootScope.myID, $rootScope.cruHandler);
  $scope.chatter.apply = function() {
    $rootScope.safeApply($scope);
  }
  $scope.chatter.clearInput = function() {
    $scope.chatInput = "";
  }
  $scope.chatter.scrollDown = function() {
    scrollDown();
  }
  $scope.chatter.focusInput = function() {
    chatInputBox.focus();
  }

  $scope.trapper = new trapper();
  $scope.trapper.apply = function() {
    $rootScope.safeApply($scope);
  }

  $scope.whiteboarder = new whiteboarder();

  console.log("READY");


  /************************* JOINING A CHATROOM ************************/

  // Listener that allows other controllers to call joinRoomChat
  $scope.$on('joinRoomChat', function(event, data) {
    $scope.joinRoomChat(data.room_id);
  })

  // Join a room's chat
  $scope.joinRoomChat = function(room_id) {
    $scope.chatter.joinRoomChat(room_id);
    $scope.trapper.joinParty(room_id);
    $scope.whiteboarder.hideWhiteboard();
  }
  /*********************************************************************/
  /*************************** SENDING CHATS ***************************/

  // Send chat when send button is pressed
  $scope.sendChatMessage = function(chatInput) {
    if (chatInput) {
      $scope.chatter.sendChatMessage(chatInput);
    }
  };

  $scope.messageClicked = function(event) {
    console.log("MSG CLICKED");
    var messageDiv = event.currentTarget;
    $scope.chatter.messageClicked(messageDiv);
  };


  // Scroll event listener -- see more messages if scroll within 200px of top
  var lastScroll = 0;
  $scope.scrollevent = function() {
    ////console.log("Scroll top: " + div.scrollTop);
    ////console.log("CURRENT HEIGHT: " + div.scrollHeight);
    var currentScroll = div.scrollTop;
    if(currentScroll <= 200 && currentScroll < lastScroll) {
      //don't call seeMore if still processing past one
      if (!$scope.chatter.scrollLock) { 
        $scope.chatter.seeMoreMessages(300);
      }
    }
    lastScroll = currentScroll;
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


  /******************************** WHITEBOARD *************************/
  $scope.toggleWhiteboard = function() {
    $scope.whiteboarder.currRoomCallID = $rootScope.caller.currRoomCallID;
    $scope.whiteboarder.toggleWhiteboard();
  }
  


  /******************************** CURR TYPING ************************/
  $scope.keypress = function(e) {
    setTimeout(function() {
      $scope.chatter.processTyping();
    }, 10);
  };

  $window.onbeforeunload = function() {
    //in order to leave DM on window close
    var temp = new XMLHttpRequest();
    temp.open("GET", "/typing/false/" + $rootScope.currRoomChatID, true);
    temp.send();
  };

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
