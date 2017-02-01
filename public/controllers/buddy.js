var myApp = angular.module('BuddySystem', []);

myApp.controller('buddies',['$scope', '$http', function($scope, $http){

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
  
	$scope.addFriend = function(){
    userExists($scope.friend.name, function(response){
      if(response){
        console.log("USER EXISTS " + response['_id']);
        buddyRequestExists(3, 7, function(requestExists){ // param1 should be user_id, 
                                                          // param2 should be friend_id
          console.log("BUDDY REQUEST EXISTS? " + requestExists);
          console.log(requestExists);
          if(!requestExists || requestExists.length == 0){ 
             console.log("ARE WE FRIENDS ALREADY");          
             friendshipExists(2, 6, function(friendship){
                console.log("FRIENDSHIP? " + friendship);
                if(!friendship || friendship.length == 0){
                  var data = {"sent_from_id":String(4), // should be user_id and friend_id
                              "sent_to_id":String(5)};
                  $http.post('/send_buddy_request', data).then(function(response){
			              console.log(response.data);
		              });  
                }
             });
          }
        });
      }
      
    });
      
    // cant already be an existing request
      // check if they sent you a request
      // check if you sent them a request
    // cant already be friends
    
	};
  
}]);