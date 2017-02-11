//NOTE: NEED TO ADD USERID THROUGH COOKIES IN ORDER TO MAKE PREFERENCES UNIQUE PER USER

var myApp = angular.module('BlockSystem', []);

myApp.controller('blocker',['$scope', '$http', function($scope, $http){
  
  var getIdFromName = function(name, onResponseReceived){
    var email = {"email": String(name)};
    console.log(email);
    $http.post('/get_Id_From_Name', email).then(function(response){
      console.log(response.data);
			onResponseReceived(response.data);
		});    
  }

  $scope.blockUser = function(){
    getIdFromName($scope.block_user.name, function(response){
      console.log(response);
      
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