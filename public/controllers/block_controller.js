//NOTE: NEED TO ADD USERID THROUGH COOKIES IN ORDER TO MAKE PREFERENCES UNIQUE PER USER

var myApp = angular.module('BlockSystem', []);

myApp.controller('blocker',['$scope', '$http', function($scope, $http){
  
  var getIdFromName = function(name, onResponseReceived){
    var email = {"email": String(name)};
    //console.log(email);
    $http.post('/get_Id_From_Name', email).then(function(response){
			onResponseReceived(response.data);
		});    
  }
  var refresh = function(){
    $http.get('/get_blocked_users').then(function(response){
			$scope.block_user_list = response.data;
		});
  }
  var addBlock = function(blocked_user_id, blocked_user_email, onResponseReceived){
    var data = {
                "blocked_user_id": String(blocked_user_id),
                "blocked_user_email": blocked_user_email
               }; 
               //console.log("ADD");
    $http.post('/add_blocked_user', data).then(function(response){
			onResponseReceived(response.data);
		});
  };
  $scope.unblock = function(id){
    
    //console.log(id);
    $http.delete('/remove_block/' + id).then(function(response){
      refresh();
    });
  }
  refresh();
  $scope.blockUser = function(){
    getIdFromName($scope.block_user.name, function(response){
      //console.log(response);
      if(response){
        //console.log(response.user_id);
        addBlock(response.user_id, response.email, function(response){
          //console.log("XX");
          //console.log(response);
          refresh();
        });
      }
    });
  }
}]);