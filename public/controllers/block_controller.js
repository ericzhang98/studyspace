//NOTE: NEED TO ADD USERID THROUGH COOKIES IN ORDER TO MAKE PREFERENCES UNIQUE PER USER

var myApp = angular.module('BlockSystem', []);

myApp.controller('blocker',['$scope', '$http', function($scope, $http){
  
  var getIdFromName = function(name, onResponseReceived){
    var email = {"email": String(name)};
    console.log(email);
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
               console.log(data);
    $http.post('/add_blocked_user', data).then(function(response){
			onResponseReceived(response.data);
		});
  };
  refresh();
  $scope.blockUser = function(){
    getIdFromName($scope.block_user.name, function(response){
      console.log(response);
      if(response){
        console.log(response.user_id);
        addBlock(response.user_id, response.email, function(response){
          console.log("XX");
          console.log(response);
          refresh();
        });
      }
    });
  }
  
  /*
	$scope.user_classes_list = null;
	$scope.user_id = '1';

	$scope.addClass = function(){
		$scope.user_classes.user_id = '1';
		$http.post('/user_classes', $scope.user_classes).then(function(response){
			refresh($scope.user_id);
		});
	};
	
  var getClassList = function(){
    $http.get('/scrape_classes').then(function(response){
			console.log(response.data);
		});    
  }
	var refresh = function(id){
		$http.get('/user_classes/' + id).then(function(response){
			$scope.user_classes_list = response.data;
		});
	};
  
  getClassList();
	refresh($scope.user_id);
	
	$scope.remove = function(id){
		$http.delete('/user_classes/' + id).then(function(response){
			refresh($scope.user_id);
		});
	};
  */
}]);