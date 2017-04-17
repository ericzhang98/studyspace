// controller for buddies
myApp.controller("BuddyController", function($scope, $rootScope, $http) {

  // Grab initial notifictions and start a listener for updates
  startMessageNotifications();

  /**************************** BUDDY SYSTEM ***************************/

  // status method
  $scope.isFriendsWith = function(user_id) {

    // empty buddies null check
    if (!$scope.added_buddies_list) {
      return -1;
    }

    var index;
    for (index = 0; index < $scope.added_buddies_list.length; ++index) {
      var buddy = $scope.added_buddies_list[index]; 
      if (buddy.user_two_id == user_id) {
        return index;
      }
    }
    return -1;
  }

  $scope.toggleIsFriend = function(user_id) {
    var index = $scope.isFriendsWith(user_id);
    if (index > -1) {
      $scope.deleteFriend(user_id);
      $scope.added_buddies_list.splice(index, 1);
      //TODO redirect to home page if in DM with deleted friend
    }
    else {
      $scope.sendRequest(user_id);
    }
  }

  // gets a user's buddy requests, calls a callback on the data,
  // and returns the result of the callback
  function getBuddyRequests(onResponseReceived){
    $http.post('/get_my_buddy_requests').then(function(response){
      return onResponseReceived(response.data);
    });
  };

  // gets a user's list of buddies, calls a callback on the data,
  // and returns the result of the callback
  function getBuddies(onResponseReceived){
    $http.post('/get_my_buddies').then(function(response){
      if (response.data[0]) {
        //console.log(response.data[0]);
        return onResponseReceived(response.data[0]['buddies']);
      }
    });
  };
  
  // checks if the user exists, calls a callback on the data
  // and either returns null or the user object
  function userExists(other_user_id, onResponseReceived){  
    $http.post('/buddy_existing_user', {other_user_id: other_user_id}).then(function(response){
      return onResponseReceived(response.data);
    });
  };

  // checks if this buddy request already exists, calls a callback
  // on the data and either returns null or the request
  function buddyRequestExists(friend_id, onResponseReceived){
    var data = {"user_id":"user_id placed here",
                "friend_id":String(friend_id)};
    $http.post('/buddy_existing_request', data).then(function(response){
      return onResponseReceived(response.data);
    });   
  };

  // checks if the two users are already friends, calls a callback
  // on the data containing the friendship object or null
  function friendshipExists(friend_id, friend_name, onResponseReceived){
    var data = {"user_id":"user_id inserted",
                "friend_id":String(friend_id),
                "friend_name":String(friend_name)};
    $http.post('/buddies_already', data).then(function(response){
      return onResponseReceived(response.data);
    });   
  }  

  // deletes a friend and then in the callback calls to update the buddy requests
  function deleteBuddy(id, onResponseReceived){
    //console.log(id);
    $http.delete('/reject_buddy/' + id).then(function(response){
      getBuddyRequests(function(response){ 
        $scope.buddies_list = response;
      });
    });
  };

  // adds a friendship in the database and deletes the request, and calls 
  // a callback on the data
  function acceptBuddy(data, onResponseReceived){
    //console.log(data);
    $http.post('/accept_buddy', data).then(function(response){
      return onResponseReceived(response.data);
    });      
  }

  // updates the buddy requests list
  getBuddyRequests(function(response){ 
    $scope.buddies_list = response; 
  });

  // gets the users added buddies
  getBuddies(function(response){ 
    $scope.added_buddies_list = response;
    $scope.added_buddies_list.sort(ezSort);
    /*$scope.buddy_id_list = [];

    var index;
    for (index = 0; index < $scope.added_buddies_list.length; ++index) {
      var buddy = $scope.added_buddies_list[index]; 
      $scope.buddy_id_list.push(buddy.user_two_id);
    }*/

    setupOnlineNotifications();
  });

  // functionality for sending a buddy request
  $scope.sendRequest = function(other_user_id){
    //console.log("friend request to " + other_user_id);
    // checks if the user exists, if not exits
    userExists(other_user_id, function(response){
      //console.log(response);
      if(response){
        var friend_id = response.user_id;
        var friend_name = response.name;
        //console.log(friend_id);
        // checks if the buddy request already exists, if it does then exits
        buddyRequestExists(friend_id, function(requestExists){ 

          //console.log("BUDDY REQUEST EXISTS? " + requestExists);
          //console.log(requestExists);
          if(!requestExists || requestExists.length == 0){ 
            //console.log("ARE WE FRIENDS ALREADY"); 
            // checks if you're already friends, if you are then exits            
            friendshipExists(friend_id, friend_name, function(friendship){ 
              //console.log("FRIENDSHIP? " + friendship);
              if(!friendship || friendship.length == 0){
                // if we made it here then we send a friend request
                //console.log("Adding friend");
                var data = {"sent_from_id":"Place user_id here", 
                            "sent_from_name": "user_name",
                            "sent_to_id":String(friend_id),
                            "sent_to_name": String(friend_name)};
                $http.post('/send_buddy_request', data).then(function(response){
                  //console.log(response.data);
                  showAlert('buddy-request-alert', 'normal', false);
                });  
              }
            });
          }
        });
      }
    });
  };

  $scope.sendRequestWithEmail = function(other_user_email) {
    $http.get("/user_id_from_email/" + other_user_email).then(function(response) {
      if (response.error == null) {
        var other_user_id = response.data.user_id;
        $scope.sendRequest(other_user_id);
        closeModal("#modal-buddy-request", "#buddy-request");
      }
      else {
        //console.log("An account with that email does not exist");
      }
    });
  }

  $scope.rejectBuddyRequest = function(id){
    //console.log(id);
    deleteBuddy(id, function(response){});
  };

  $scope.acceptBuddy = function(requestInfo){
    var data = {"user_one_id":String(requestInfo.sent_to_id),
                "user_one_name":String(requestInfo.sent_to_name),
                "user_two_id":String(requestInfo.sent_from_id),
                "user_two_name":String(requestInfo.sent_from_name)};

    acceptBuddy(data, function(response){
      deleteBuddy(requestInfo._id, function(response){});
    });

    getBuddies(function(response){
      $scope.added_buddies_list = response;
    });
  };

  $scope.deleteFriend = function(id){
    //console.log(id);
    $http.delete('/remove_buddy/' + id).then(function(response){
      getBuddies(function(response){ //TODO:Change this to get buddies for uid
        $scope.added_buddies_list = response;
      });
    });    
  };

  $scope.getDMID = function(other_user_id) {
    if (myID > other_user_id){     
      return myID + other_user_id;
    }

    else {
      return other_user_id + myID;
    }    
  }

  $scope.openDM = function(other_user_id, other_user_name){

    // the room_id of DM's between id's "aaa" and "bbb"
    // will be "bbbaaa"
    var dm_room_id = $scope.getDMID(other_user_id);

    //console.log("entering dm room with id: " + dm_room_id);

    // set up dummy class/room
    $rootScope.cruHandler.classes["dm_class_id"] = {
      "name" : ""
    }

    $rootScope.cruHandler.rooms[dm_room_id] = {
      "name" : other_user_name,
      "class_id" : "dm_class_id",
      "other_user_id" : other_user_id
    }

    //get other user info
    $http.get('/get_user/' + other_user_id).then(function(response) {
      $rootScope.cruHandler.users[response.data.user_id] = response.data;
      //console.log("user info pulled: " + response.data.name + " " + response.data.user_id);
      // join the chat needs to be on callback b/c of currTyping
      $rootScope.joinRoomChatBC(dm_room_id);
    });

    $http.get("/clear_message_notifications/" + other_user_id);
    $scope.messageNotifications[other_user_id] = 0;
  };

  $scope.openBuddyRequest = function() {
    //console.log('open moodal for buddy request');
    $("#modal-buddy-request").fadeIn(100);
    //set timeout?
    setTimeout(function() {
      $("#buddy-request").removeClass("hide");
      $("#buddy-request").addClass("fadeInBack");
    }, 100);
  }


  //Message notifications
  function startMessageNotifications() {
    //grab all notifs on load
    $scope.messageNotifications = {};
    //TODO: test notifications on new buddy accept
    if (getSignedCookie("user_id")) {
      databaseRef.child("Notifications").child(getSignedCookie("user_id"))
        .child("MessageNotifications").once("value", function(snapshot) {
          var snapshotValue = snapshot.val();
          if (snapshotValue) {
            //setup message notifications dictionary
            var keys = Object.keys(snapshotValue);
            for (var i = 0; i < keys.length; i++) {
              $scope.messageNotifications[keys[i]] = snapshotValue[keys[i]];
            }
            $rootScope.safeApply($scope);
          }

          //continuous listener for updates
          databaseRef.child("Notifications").child(getSignedCookie("user_id"))
            .child("MessageNotifications").on("child_changed", function(snapshot) {
              var numMessages = snapshot.val();
              if (numMessages) {
                if ($scope.getDMID(snapshot.key) != $rootScope.currRoomChatID) {
                  //update msg notifications property if not in current chat
                  $scope.messageNotifications[snapshot.key] = numMessages
                  $rootScope.safeApply($scope);
                }
                else {
                  //tell server to set msg notif to zero since we already in DM
                  $http.get("/clear_message_notifications/" + snapshot.key);
                  $scope.messageNotifications[snapshot.key] = 0;
                }
              }
          });
      });
    }
  }

  //Check online buddies
  function setupOnlineNotifications() {
    $scope.buddies_status= {};
    var lastOnline = {};
    for (var i = 0; i < $scope.added_buddies_list.length; i++) {
      var other_user_id = $scope.added_buddies_list[i].user_two_id;
      startOnlineListener(other_user_id);
    }
  }

  function startOnlineListener(other_user_id) {
    databaseRef.child("UserActivity").child(other_user_id).child("online")
      .on("value", function(snapshot) {
        if (snapshot.val()) {
          ////console.log("buddy online - " + other_user_id);
        }
        else if ($scope.buddies_status[other_user_id] == true) {
          ////console.log("buddy offline - " + other_user_id);
        }
        $scope.buddies_status[other_user_id] = snapshot.val();
        adjustBuddyList();
        $rootScope.safeApply($scope);
    });
  }

  function adjustBuddyList() {
    buddies_online = [];
    buddies_offline = [];
    for (var i = 0; i < $scope.added_buddies_list.length; i++) {
      if ($scope.buddies_status[$scope.added_buddies_list[i].user_two_id]) {
        buddies_online.push($scope.added_buddies_list[i]);
      }
      else {
        buddies_offline.push($scope.added_buddies_list[i]);
      }
    }
    //buddies_online.sort(ezSort);
    //buddies_offline.sort(ezSort);
    $scope.added_buddies_list = buddies_online.concat(buddies_offline);
  }
  function ezSort(a, b) {
    return a.user_two_name.localeCompare(b.user_two_name);
  }

  $scope.isDank = function() {return getCookie("dank");}
});