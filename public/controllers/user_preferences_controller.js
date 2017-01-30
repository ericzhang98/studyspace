//NOTE: NEED TO ADD USERID THROUGH COOKIES IN ORDER TO MAKE PREFERENCES UNIQUE PER USER

var myApp = angular.module('UserPreferences', []);

myApp.controller('preferences',['$scope', '$http', function($scope, $http){
	$scope.user_classes_list = null;
	$scope.user_id = '1';

	$scope.addClass = function(){
		$scope.user_classes.user_id = '1';
		$http.post('/user_classes', $scope.user_classes).then(function(response){
			refresh($scope.user_id);
		});
	};
	
	var refresh = function(id){
		$http.get('/user_classes/' + id).then(function(response){
			$scope.user_classes_list = response.data;
		});
	};

	refresh($scope.user_id);
	
	$scope.remove = function(id){
		$http.delete('/user_classes/' + id).then(function(response){
			refresh($scope.user_id);
		});
	};
}]);