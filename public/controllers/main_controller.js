var songDatabase = null;
var myApp = angular.module("mainApp", ["ngMaterial", "ngSanitize"]);

// initializing rootScope variables
// rootScope variables are used by multiple controllers
myApp.run(function($rootScope) {

  $rootScope.myID = getSignedCookie("user_id");
  $rootScope.myName = getSignedCookie("name");
  $rootScope.currRoomChatID = null;
  $rootScope.caller = new Caller($rootScope.myID);
  $rootScope.caller.volumeListener.setOnLoudChangeFunc(function() {$rootScope.$broadcast('volumeListenerChange')});
  $rootScope.cruHandler = new CRUHandler();
  $rootScope.cruHandler.setOnChangeFunc(function() {$rootScope.$broadcast('cruChange')});
  $rootScope.downHandler = new DownHandler();
  $rootScope.downHandler.joinDownList("AAS_10");

  // broadcast methods
  // called in BuddyController, goes to ChatController
  $rootScope.joinRoomChatBC = function(room_id) {
    $rootScope.$broadcast('joinRoomChat', {room_id : room_id});
  }

  // called in RoomController, goes to VideoController
  $rootScope.toggleViewVideoBC = function() {
    $rootScope.$broadcast('toggleViewVideo');
  }

  // called in MainController, goes to AddClassController
  $rootScope.refreshAddClassBC = function() {
    $rootScope.$broadcast('refreshAddClass');
  }

  // called in AddClassController, goes to MainController
  $rootScope.getClassBC = function(class_id) {
    $rootScope.$broadcast('getClass', {class_id : class_id});
  }

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

/**************************** MAIN CONTROLLER ****************************/
// - Master controller for main room
// - Contains methods that use / modify scope variables and aren't
//   associated with a particular portion of the UI
/*************************************************************************/

myApp.controller("MainController", ["$scope", "$rootScope", "$http", "$timeout", "$window",
function($scope, $rootScope, $http, $timeout, $window) {
  // general vars
  /*************************** ACCOUNT MANAGEMENT *********************/
  $scope.logout = function() {

    // leave current room
    $scope.caller.leaveRoomCallHard();

    // erase cookies
    removeCookie("user_id");
    removeCookie("email");
    removeCookie("name");

    // go to home
    window.onbeforeunload = null;
    window.location.href = "/";
  }
  /*********************************************************************/
  /************************ BROADCAST LISTENERS ************************/

  // Respond to a volumeListener change
  $scope.$on('volumeListenerChange', function(event, data) {
    $scope.$apply();
  })

  // Respond to a cruContainer change
  $scope.$on('cruChange', function(event, data) {
    $rootScope.safeApply($scope);
  })

  // Allows other controllers to call getClass
  $scope.$on('getClass', function(event, data) {
    $rootScope.cruHandler.getClass(data.class_id);
  });

  /*********************************************************************/
  /*************************** ROOM INTERACTION ************************/

  $scope.openCreateRoomModal = function(class_id) {
    //console.log('create room');
    creationClassID = class_id;
    $("#modal-create-room").fadeIn(100);
    setTimeout(function() {
      $("#create-room").removeClass("hide");
      $("#create-room").addClass("fadeInBack");
    }, 100);
  }

  $scope.joinRoom = function(room_id, class_id) {
    $rootScope.caller.joinRoomCall(room_id);
    $rootScope.joinRoomChatBC(room_id);
  };

  $scope.leaveRoom = function() {
    
    // leave room case
    if ($rootScope.cruHandler.rooms[$rootScope.currRoomChatID].class_id != 'dm_class_id') {
      $rootScope.caller.leaveRoomCall();
      $rootScope.joinRoomChatBC(null); //leave chat room
    }

    // close dm case
    else {
      $rootScope.joinRoomChatBC($rootScope.caller.currRoomCallID); // join or leave chat room
    }
  }

  // Expands sidebar panel for given class
  function adjustSidebarToggle(class_id) {
    $rootScope.cruHandler.my_class_ids.forEach(function(my_class_id) {

      if (my_class_id == class_id && $("#" + my_class_id).is(":hidden")) {
        $('#' + my_class_id).collapse('toggle');
      }
    });
  };

  // onclick method that will toggles the user audio of the given user_id
  $scope.toggleUserAudio = function(user_id) {
    $rootScope.caller.toggleRemoteStreamAudioEnabled(user_id);
  };

  $scope.getRemoteStreamExists = function(user_id) {
    return document.getElementById(user_id + "_video")
    //return myRemoteStreams[user_id];
  }

  // - is this person muted?
  $scope.getRemoteStreamAudioEnabled = function(user_id) {
    return document.getElementById(user_id + "_video") && !document.getElementById(user_id + "_video").muted;
  }
  
  $('.item').click(function(e) {
    e.stopPropagation();
    $('.dropdown-toggle').dropdown('toggle');
  });
  
  /*********************************************************************/
  /**************************** PULLING DATA ***************************/
  /*********************************************************************/

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
    return "whiteboard.html#" + $rootScope.caller.currRoomCallID;
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
    $rootScope.caller.toggleMyStreamAudioEnabled();
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
