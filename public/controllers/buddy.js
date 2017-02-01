var myApp = angular.module('BuddySystem', []);

myApp.controller('buddies',['$scope', '$http', function($scope, $http){

  var getBuddyRequests = function(id, onResponseReceived){
    var data = {"sent_to_id":String(id)};
    console.log(data);
    $http.post('/buddy_requests', data).then(function(response){
        //console.log(response.data);
        return onResponseReceived(response.data);
      });
  };
  
  var getBuddies = function(id, onResponseReceived){
    var data = {"user_one_id":String(id)};
    $http.post('/get_added_buddies', data).then(function(response){
        //console.log(response.data);
        return onResponseReceived(response.data);
      });
  };
  
  var userExists = function(name, onResponseReceived){  
    $http.post('/buddy_existing_user', $scope.friend).then(function(response){
      //console.log(response.data + "RESPONSE");
			return onResponseReceived(response.data);
		});
  };
  
  var buddyRequestExists = function(user_id, friend_id, onResponseReceived){
    var data = {"user_id":String(user_id),
    "friend_id":String(friend_id)};
    $http.post('/buddy_existing_request', data).then(function(response){
			return onResponseReceived(response.data);
		});   
  };
  
  var friendshipExists = function(user_id, friend_id, onResponseReceived){
    var data = {"user_id":String(user_id),
    "friend_id":String(friend_id)};
    $http.post('/buddies_already', data).then(function(response){
			return onResponseReceived(response.data);
		});   
  }  
  var deleteBuddy = function(id, onResponseReceived){
		$http.delete('/reject_buddy/' + id).then(function(response){
			getBuddyRequests(8, function(response){ //TODO: Change this to get buddyRequests for uid
        $scope.buddies_list = response;
      });
		});
  };
  var acceptBuddy = function(data, onResponseReceived){
    console.log(data);
    $http.post('/accept_buddy', data).then(function(response){
			return onResponseReceived(response.data);
		});      
  }
  
  getBuddyRequests(8, function(response){ //TODO: Change this to get buddyRequests for uid
    console.log(response);
    $scope.buddies_list = response; // TODO: Change the html to show sent from name not id
  });
  
  getBuddies(8, function(response){ //TODO:Change this to get buddies for uid
    $scope.added_buddies_list = response;
  });
  
	$scope.sendRequest = function(){
    userExists($scope.friend.name, function(response){
      if(response){
        console.log(response);
        buddyRequestExists(3, 7, function(requestExists){ // param1 should be user_id, 
                                                          // param2 should be friend_id
          console.log("BUDDY REQUEST EXISTS? " + requestExists);
          console.log(requestExists);
          if(!requestExists || requestExists.length == 0){ 
             console.log("ARE WE FRIENDS ALREADY");          
             friendshipExists(2, 6, function(friendship){ // should be user_id and friend_id
                console.log("FRIENDSHIP? " + friendship);
                if(!friendship || friendship.length == 0){
                  var data = {"sent_from_id":String(4), // should be user_id and friend_id
                              "sent_from_name": "user_name",
                              "sent_to_id":String(5),
                              "sent_to_name": $scope.friend.name};
                  $http.post('/send_buddy_request', data).then(function(response){
			              console.log(response.data);
		              });  
                }
             });
          }
        });
      }
    });
	};
  
  $scope.rejectBuddyRequest = function(id){
    console.log(id);
    deleteBuddy(id, function(response){});
	};
  
  $scope.acceptBuddy = function(requestInfo){
    //console.log(requestInfo);
    var data = {"user_one_id":String(requestInfo.sent_from_id),
                "user_one_name":String(requestInfo.sent_from_name),
                "user_two_id":String(requestInfo.sent_to_id),
                "user_two_name":String(requestInfo.sent_to_name)};
                
    acceptBuddy(data, function(response){
      deleteBuddy(requestInfo._id, function(response){});
    });
    
    getBuddies(8, function(response){ //TODO:Change this to get buddies for uid
      $scope.added_buddies_list = response;
    });
    
    
  };
  
  $scope.deleteFriend = function(id){
    
		$http.delete('/remove_buddy/' + id).then(function(response){
      getBuddies(8, function(response){ //TODO:Change this to get buddies for uid
        $scope.added_buddies_list = response;
      });
		});    
  };
}]);


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