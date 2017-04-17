var songDatabase = null;
var myApp = angular.module("mainApp", ["ngMaterial", "ngSanitize"]);

// initializing rootScope variables
// rootScope variables are used by multiple controllers
myApp.run(function($rootScope) {

  $rootScope.myID = getSignedCookie("user_id");
  $rootScope.myName = getSignedCookie("name");

  $rootScope.currRoomChatID = null;
  $rootScope.classes = {}      // class_id : class, grabbed on initial load
  $rootScope.rooms = {}        // room_id : room, listened to after grabbing classes
  $rootScope.users = {}        // user_id : user, info added as u join rooms
  $rootScope.my_class_ids = [];

  $rootScope.caller = new Caller($rootScope.myID);

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

// pull class data
myApp.run(function($rootScope) {

});

/**************************** MAIN CONTROLLER ****************************/
// - Master controller for main room
// - Contains methods that use / modify scope variables and aren't
//   associated with a particular portion of the UI
// - Contains
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

  /*-------------------------------------------------------------------*/
  /***************************** CLASSES BAR ***************************/
  /*-------------------------------------------------------------------*/

  /******************************* SETUP ******************************/

  // Scope variables
  $scope.class_rooms = {}  // class_id : list of room_ids
  $scope.volumes = {};      // user_id : int (volume coming from them);

  $rootScope.caller.volumeListener.addOnLoudChangeFunc(function() {$scope.$apply()});

  // Initial call to pull data for user / classes / rooms
  getClasses();

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
    if ($rootScope.rooms[$rootScope.currRoomChatID].class_id != 'dm_class_id') {
      $rootScope.caller.leaveRoomCall();
      $rootScope.joinRoomChatBC(null); //leave chat room
    }

    // close dm case
    else {
      $rootScope.joinRoomChatBC($rootScope.caller.currRoomCallID); // join or leave chat room
    }
  }

  $window.onbeforeunload = function() {
    //in order to leave DM on window close
    var temp = new XMLHttpRequest();
    temp.open("GET", "/typing/false/" + $rootScope.currRoomChatID, true);
    temp.send();
  };

  // Sidebar setup, makes sure that at most one class is open at a time
  var $myGroup = $('#classes');
  $myGroup.on('show.bs.collapse','.collapse', function() {
    $myGroup.find('.collapse.in').collapse('hide');
  });

  // Expands sidebar panel for given class
  function adjustSidebarToggle(class_id) {
    $rootScope.my_class_ids.forEach(function(my_class_id) {

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
  // Listener that allows other controllers to call getClass
  $scope.$on('getClass', function(event, data) {
    getClass(data.class_id);
  });

  // - gets all class_ids for user
  // - delegates to getClass
  function getClasses() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', "/get_my_classes", true); // responds with class_ids
    xhr.send();

    xhr.onreadystatechange = function(e) {
      if (xhr.readyState == 4 && xhr.status == 200) {
        var response = JSON.parse(xhr.responseText);

        // Set this scope variable (used in create room)
        if (response.class_ids) {
          $rootScope.my_class_ids = response.class_ids;
        }

        $rootScope.my_class_ids.push('lounge_id');

        // Get more data
        for (i = 0; i < $rootScope.my_class_ids.length; i++) {
          getClass($rootScope.my_class_ids[i]);
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

        $rootScope.classes[class_id] = response;

        // update UI
        $rootScope.safeApply($scope);

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
      $rootScope.safeApply($scope);
    }

    // detach listeners for removed rooms
    for (i = 0; i < curr_rooms.length; i++) {
      // if this room is not in the new rooms, detach listener
      if (updated_rooms.indexOf(curr_rooms[i]) == -1) {
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

        var roomUniqueUsers = [];
        //rm duplicate users
        if (room.users) {
          roomUniqueUsers = Object.values(room.users);
          roomUniqueUsers = roomUniqueUsers.filter(function(element, index, self) {
            return index == self.indexOf(element);
          });
        }

        // update the room
        $rootScope.rooms[room_id] = new Room(room_id, room.name, room.host_id, room.class_id, 
                                         room.is_lecture, roomUniqueUsers, room.host_name ? room.host_name : "Unknown host");

        // are there tutors in here?
        detectTutors($rootScope.rooms[room_id]);

        // how many people are studying for this class now?
        setNumUsers($rootScope.rooms[room_id].class_id);

        // get room users
        updateRoomUsers($rootScope.rooms[room_id]);

        // update currTyping ppl
        //updateCurrTyping();

        $rootScope.safeApply($scope);
      }
    });
  }

  // Set the number of total users studying for a class at the moment
  function setNumUsers(class_id) {
    ////console.log("setting num users for " + class_id);
    $rootScope.classes[class_id].num_users = 0;

    for (i = 0; i < $scope.class_rooms[class_id].length; i++) {
      var room = $rootScope.rooms[$scope.class_rooms[class_id][i]];

      // if there are users in this room
      if (room && room.users) {
        // add them to the number of users in this class
        $rootScope.classes[class_id].num_users += room.users.length;
      }
    }
  }

  // check if there is a tutor present in a room
  // update rooms and classes accordingly
  function detectTutors(room) {

    var tutor_ids = $rootScope.classes[room.class_id].tutor_ids;

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
      var r_index = $rootScope.classes[room.class_id].rooms_with_tutors.indexOf(room.room_id);

      // if we weren't a tutor room before and we are now
      if (r_index == -1 && room.has_tutor) {
        $rootScope.classes[room.class_id].rooms_with_tutors.push(room.room_id);
      }

      // if we used to be a tutor room and we aren't anymore
      else if (r_index != -1 && !room.has_tutor) {
        $rootScope.classes[room.class_id].rooms_with_tutors.splice(r_index, 1);
      }
    }
  }

  // getting the list of users in this room
  function updateRoomUsers(room, callback) {
    ////console.log("this is a room " + room);
    if (room) {
      ////console.log("getting new list of users for room: " + room.room_id);
      ////console.log($rootScope.rooms);
      for (var i = 0; i < room.users.length; i++) {
        if (!(room.users[i] in $rootScope.users)) {
          var id = room.users[i];
          $http.get('/get_user/' + room.users[i]).then(function(response) {
            $rootScope.users[response.data.user_id] = response.data;
            //console.log("user info pulled: " + response.data.name + " " + response.data.user_id);
            if (callback){callback();}
          });
        }
      }
    }
  }

  /*********************************************************************/

  $scope.isTutor = function(user_id, room_chat_id) {
    return $rootScope.classes[$rootScope.rooms[room_chat_id].class_id].tutor_ids &&
    $rootScope.classes[$rootScope.rooms[room_chat_id].class_id].tutor_ids.indexOf(user_id) != -1;
  }

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
