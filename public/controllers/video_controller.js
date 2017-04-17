myApp.controller("VideoController", function($scope, $rootScope, $http) {

  // Listener that allows other controllers to call joinRoomChat
  $scope.$on('toggleViewVideo', function(event, data) {
    $scope.toggleViewVideo();
  })

  /** VIDEO LUL *************************************/
  $scope.viewVideo = false;
  $scope.userStreamSources = {};

  $scope.toggleViewVideo = function() {
    $scope.viewVideo = !$scope.viewVideo;

    // if we closed video, turn my video off
    if (!$scope.viewVideo) {
      $rootScope.caller.setMyStreamVideoEnabled(false, false);
    }

    // if we opened video and we were showing before, turn my video off
    console.log("showVideo is " + $rootScope.caller.showVideo)
    if ($scope.viewVideo && $rootScope.caller.showVideo) {
      $rootScope.caller.setMyStreamVideoEnabled(true);
    }
  }

  $scope.setMyStreamVideoEnabled = function(enabled, direct = true) {
    $rootScope.caller.setMyStreamVideoEnabled(enabled, direct);
  }

  $scope.getVideoEnabled = function() {
    return $rootScope.caller.getVideoEnabled();
  }
});