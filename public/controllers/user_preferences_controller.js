//NOTE: NEED TO ADD USERID THROUGH COOKIES IN ORDER TO MAKE PREFERENCES UNIQUE PER USER

var myApp = angular.module('UserPreferences', []);

myApp.controller('preferences',['$scope', '$http', function($scope, $http){
	$scope.user_classes_list = null;

	$scope.addClass = function(){
		$http.post('/user_classes', $scope.user_classes).then(function(response){
			refresh();
		});
	};
	
  var getClassList = function(){
    $http.get('/scrape_classes').then(function(response){
			console.log(response.data);
		});    
  }
	var refresh = function(){
		$http.get('/user_classes').then(function(response){
			$scope.user_classes_list = response.data;
		});
	};
  
  //getClassList();
	refresh();
	
	$scope.remove = function(id){
		$http.delete('/user_classes/' + id).then(function(response){
			refresh($scope.user_id);
		});
	};
}]);