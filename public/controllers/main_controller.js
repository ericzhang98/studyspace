//Main App Controller
var chatDatabase = null;
var typingDatabase = null;
var chatPinnedDatabase = null

var songDatabase = null;
var myApp = angular.module("mainApp", ["ngMaterial", "ngSanitize"]);

var CONCAT_TIME = 60*1000; // 1 minute
var currPing = null;
var USER_PING_PERIOD = 10*1000;


// initializing rootScope variables
// rootScope variables are used by multiple controllers
myApp.run(function($rootScope) {

  // 
  $rootScope.currRoomCallID = null;
  $rootScope.currRoomChatID = null;
  $rootScope.classes = {}      // class_id : class, grabbed on initial load
  $rootScope.rooms = {}        // room_id : room, listened to after grabbing classes
  $rootScope.users = {}        // user_id : user, info added as u join rooms
  $rootScope.my_class_ids = [];

  // broadcast methods
  // calls joinRoomChat in ChatController
  $rootScope.joinRoomChat = function(room_id) {
    $rootScope.$broadcast('joinRoomChat', {room_id : room_id});
  }

  $rootScope.toggleViewVideo = function() {
    $rootScope.$broadcast('toggleViewVideo');
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


/* Main controller -------------------------------------*/
myApp.controller("MainController", ["$scope", "$rootScope", "$http", "$timeout", "$window",
function($scope, $rootScope, $http, $timeout, $window) {
  //console.log("Hell yeah");

  $scope.videoEnabled = true;
  // general vars
  $scope.myID = getSignedCookie("user_id");

  $scope.myName = getSignedCookie("name");


  /*************************** ACCOUNT MANAGEMENT *********************/
  $scope.logout = function() {
    // leave current room
    leaveRoomHard($rootScope.currRoomCallID);

    /*
    //send offline ping
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/offline", true);
    xhr.send();
    */

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

  // Initial call to pull data for user / classes / rooms
  getClasses();

  //setup activity ping
  //the client can mess around with this, we need to handle kicking the
  //client somehow if they stop pinging, it's fine if they can still
  //listen in on data, but other users must always be aware of prescence
  pingUserActivity(true);

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

    // if we're not already in this room's call
    if ($rootScope.currRoomCallID != room_id) {

      // leave previous room
      leaveRoom($rootScope.currRoomCallID);

      // update currRoomCallID
      $rootScope.currRoomCallID = room_id;

      // join the call
      joinRoomCall($rootScope.currRoomCallID);

      // open up the sidebar panel with this new room
      adjustSidebarToggle(class_id);
    }

    // join this room's chat
    $rootScope.joinRoomChat(room_id);
    //$rootScope.$broadcast('joinRoomChat', {room_id : room_id});
  };

  $scope.leaveRoom = function() {
    
    // leave room case
    if ($rootScope.rooms[$rootScope.currRoomChatID].class_id != 'dm_class_id') {

      leaveRoom($rootScope.currRoomCallID);
      $rootScope.currRoomCallID = null;
      $rootScope.joinRoomChat(null); //leave chat room
    }

    // close dm case
    else {
      $rootScope.joinRoomChat($rootScope.currRoomCallID); // join or leave chat room
    }
  }

  // set listener that updates the volumes dict
  $scope.setVolumeListener = function(user_id, stream) {
    var soundMeter = new SoundMeter(window.audioContext);

    //console.log('setting volume listener to ' + user_id);
    soundMeter.connectToSource(stream, function(e) {
      if (e) {
        alert(e);
        return;
      }

      // every 200 seconds, check whether the soundMeter has been loud
      // update UI if this has changed
      setInterval(function() {
    
        if (soundMeter.loudDetected != soundMeter.loud) {
          ////console.log("changing volume to " + soundMeter.loudDetected);
          soundMeter.loud = soundMeter.loudDetected;
          $scope.$apply();
        }

        soundMeter.loudDetected = false;
      }, 500);

      // long interval for updating the UI
      $scope.volumes[user_id] = soundMeter;
    });
  }

  $window.onbeforeunload = function() {
    //in order to leave DM on window close
    var temp = new XMLHttpRequest();
    temp.open("GET", "/typing/false/" + $rootScope.currRoomChatID, true);
    temp.send();

    /*
    //send offline ping
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/offline", false);
    xhr.send();
    */
  };

  function pingUserActivity(constant) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/ping", true);
    xhr.onerror = function(){
      //console.log(xhr.status);
      showAlert("no-connection-alert", "longaf", false);
    }
    xhr.send();
    //console.log("pinging"); 
    if (constant) {
      currPing = setTimeout(pingUserActivity, USER_PING_PERIOD, true);
    }
  }

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
    toggleRemoteStreamAudioEnabled(user_id);
  };

  $scope.getRemoteStreamExists = function(user_id) {
    return document.getElementById(user_id + "_video")
    //return myRemoteStreams[user_id];
  }

  // - is this person muted?
  $scope.getRemoteStreamAudioEnabled = function(user_id) {
    return document.getElementById(user_id + "_video") && !document.getElementById(user_id + "_video").muted;
  }
  
  $('.item').click(function(e){
    e.stopPropagation();
    $('.dropdown-toggle').dropdown('toggle');
  });
  
  /*********************************************************************/
  /**************************** PULLING DATA ***************************/

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
  /**************************** BLOCK SYSTEM ***************************/

  var blockedUsers = {};
  
  $scope.toggleBlock = function(user_id) {
    if (!$scope.isBlocked(user_id)) {
      $scope.blockUserWithId(user_id);
    } else {
      $scope.unblock(user_id);
    }
  }
    
  $scope.isBlocked = function(user_id) {
    if (blockedUsers['blocked_user_list']) {
      var bUsers = blockedUsers['blocked_user_list'];

      if (bUsers.indexOf(user_id) != -1) {
        return true;
      }
    }
    return false;
  }

  var getIdFromName = function(name, onResponseReceived){
    var email = {"email": String(name)};
    //console.log(email);
    $http.post('/get_Id_From_Name', email).then(function(response){
      onResponseReceived(response.data);
    });    
  }

  var refresh = function(){
    blockedUsers = {};
    $http.get('/get_blocked_users').then(function(response){
      $scope.block_user_list = response.data;
      if(!(response.data[0])){
        return;
      }
      blockedUsers['user_id'] = response.data[0]['blocked_user_id'];
      blockedUsers['blocked_user_list'] = [];
      for (var i = 0; i < response.data.length; i++){
        var obj = response.data[i];
        blockedUsers['blocked_user_list'].push(obj['blocked_user_id']);

        if (myCalls[obj['blocked_user_id']]) {
          myCalls[obj['blocked_user_id']].close();
        }
      }
    });
  }
  
  var addBlock = function(blocked_user_id, onResponseReceived){
    var data = {
      "blocked_user_id": String(blocked_user_id),
    }; 
    $http.post('/add_blocked_user', data).then(function(response){
      onResponseReceived(response.data);
    });
  };

  refresh();
  
  $scope.blockUserWithId = function(user_id) {
    //console.log("blocking: " + user_id);
    addBlock(user_id, function(response) {
      showAlert('block-alert', 'normal', false);
      refresh();
    });
  }
  
  $scope.unblock = function(user_id){
    //console.log("unblocking: " + user_id)
    $http.delete('/remove_block/' + user_id).then(function(response){
      refresh();
    });
  }

  /******************ADD CLASS MODAL************************************/

  var allClassesNameToID = null;
  var temp_class_ids = []; // class id's that are going to be displayed
  //TODO: ERIC -- change temp_class_ids as $scope model for clealiness?

  $scope.refreshAddClass = function() {
    //deep copy so we won't copy over temp changes, also has an extra lounge_id


    temp_class_ids = $rootScope.my_class_ids.slice();
    temp_class_ids.splice(temp_class_ids.indexOf('lounge_id'), 1);

    //console.log('LUL ' + $rootScope.my_class_ids);
    //console.log('LUL ' + temp_class_ids);

    //grab all classes if they weren't pulled before
    if (allClassesNameToID == null) {
      getAllClasses();
    }
    else {
      displayClasses();
    }
  }

  // updates UI to display currently enrolled classes
  function displayClasses() {
    $scope.tempClasses = [];
    for (var i = 0; i < temp_class_ids.length; i++) {
      if (temp_class_ids[i] != "lounge_id") {
        $scope.tempClasses.push({
          class_id: temp_class_ids[i],
          class_name: getNameOfClass(temp_class_ids[i])
        });
      }
    }
    $rootScope.safeApply($scope);
  }

  /* Add, remove, and save */
  //process input to see if the class should be added
  $scope.processSelection = function processSelection() {
    //console.log($scope.selectedItem);
    //don't trigger on null (when the selected item changes from a good one)
    if ($scope.selectedItem) {
      var class_name = $scope.selectedItem;
      if (verifyClass(class_name)) {
        var class_id = allClassesNameToID[class_name];
        // Make sure the user isn't already in the class.
        if($.inArray(class_id, temp_class_ids) == -1) {
            addClass(class_id);
        } else {
          //TODO: UI for already in class
          //console.log("already in class with name " + class_name+ " and id " + class_id);
        }
      }
      else {
        //TODO: UI for class doesn't exist
        //console.log("could not verify class with name " + class_name + " and id " + class_id);
      }
    }
  }

  function verifyClass(className) {
    var returnVal = $.inArray(className, 
        Object.keys(allClassesNameToID).map(function(x){return x;}));
    return returnVal > -1;
  }

  function addClass(class_id) {
    //console.log("UI Adding " + class_id);
    temp_class_ids.push(class_id);
    displayClasses();
    $scope.searchText = "";
  }

  $scope.removeClass = function(class_id) {
    //console.log("UI Removing " + class_id);
    var index = $.inArray(class_id, temp_class_ids);
    if(index == -1) {
      //console.log("Cannot remove class, class_id" + class_id+ " not found!")
    }
    temp_class_ids.splice(index, 1);
    displayClasses();
  }

  $scope.saveChanges = function() {
    $http.post('/enroll', {class_ids: temp_class_ids});
    closeModal("#modal-add-class", "#add-class");

    //ISAAC -- call function(temp_class_ids)
    updateLocalClasses(temp_class_ids);
  }

  function updateLocalClasses(updated_class_ids) {
    //console.log("UPDATING LOCAL CLASSES")
    updated_class_ids = updated_class_ids.concat(['lounge_id']);
    //console.log('LUL2 ' + $rootScope.my_class_ids);
    //console.log('LUL2 ' + updated_class_ids);
    var noChange = true;
    updated_class_ids.forEach(function(class_id) {
      // for classes I've added
      if ($rootScope.my_class_ids.indexOf(class_id) == -1) {
        getClass(class_id);
        noChange = false;
      }
    });

    noChange = noChange && $rootScope.my_class_ids.length == updated_class_ids.length; 

    $rootScope.my_class_ids = updated_class_ids;
    $rootScope.safeApply($scope);

    if (!noChange) {
      //console.log('was changed');
      showAlert("course-change-alert", 'normal', false);
    }
  }

  // populates the allClassesNameToID dictionary with all available classes
  function getAllClasses() {
    allClassesNameToID = {};
    var xhr = new XMLHttpRequest();
    xhr.open('GET', "/get_all_classes", true); // responds with class_ids
    xhr.send();

    // once we have the user's classes
    xhr.onreadystatechange = function(e) {
      if (xhr.readyState == 4 && xhr.status == 200) {
        var response = JSON.parse(xhr.responseText);

        // populate the classes dictionary
        for (var i = 0; i < response.length; i++) {
          var classObj = response[i];
          if (classObj.class_id != "lounge_id") {
            allClassesNameToID[classObj.name] = classObj.class_id;
          }
        }
      }
      displayClasses();
    }
  }

  /* Helper functions */
  $scope.querySearch = function querySearch (query) {
    return query ? Object.keys(allClassesNameToID).filter(createFilterFor(query)) : [];
  }
  // filter function for search query to make it case-insensitive
  function createFilterFor(query) {
    return function filterFn(thisClass) {
        var uppercaseQuery = query.toUpperCase();
        pass = (thisClass.toUpperCase().indexOf(uppercaseQuery) === 0);
        thisClass = thisClass.replace(/\s+/g, '');
        pass = pass || (thisClass.toUpperCase().indexOf(uppercaseQuery) === 0);
        return pass;
    };
  }

  // returns name of class given class_id
  function getNameOfClass(class_id) {
    for (var name in allClassesNameToID) {
      if (allClassesNameToID[name] == class_id) {
        return name;
      }
    }
  }

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
    return "whiteboard.html#" + $rootScope.currRoomCallID;
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
    toggleMyStreamAudioEnabled();
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
