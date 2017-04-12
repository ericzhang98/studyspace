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
      setMyStreamVideoEnabled(false, false);
    }

    // if we opened video and we were showing before, turn my video off
    if ($scope.viewVideo && showVideo) {
      setMyStreamVideoEnabled(true);
    }
  }

  $scope.setMyStreamVideoEnabled = function(enabled, direct) {
    if (direct == undefined) {
      direct = true;
    }
    setMyStreamVideoEnabled(enabled, direct);
  }

  $scope.getVideoEnabled = function(user_id) {
    if (user_id == undefined) {
      user_id = myID;
    }
    if (user_id == myID) {
      return myStream && myStream.getVideoTracks()[0].enabled;
    }
    //return $rootScope.userstreams[user_id] && $rootScope.userstreams[user_id].getVideoTracks()[0].enabled;
  }
});