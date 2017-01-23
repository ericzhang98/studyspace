// log_in_controller.js will be a front-end javascript that
// runs on the Log In page and communicates with server.js

// used for log messages
var LOG = "log_in_controller: "

// defining the controller
angular.module('logInApp', []).controller('LogInCtrl', ['$scope', '$http', function($scope, $http) {
  console.log(LOG + "started");

  // - verifyLogin looks for a user with specified info and
  // - calls onResponseReceived when it gets a response
  var verifyLogin = function(user, onResponseReceived) {
    console.log(LOG + "verifyLogin");
    $http.post('/users', user).then(function onSuccess(response) {
      onResponseReceived(response.data);
    })
  }

  // - attempts to login
  $scope.attemptLogin = function() {
    console.log(LOG + "attemptLogin");

    // valid login info
    if (validLoginInfo($scope.user)) {

      // verify email / password
      verifyLogin($scope.user, function(user) {

        // login succeeded
        if (user != null) {

          console.log(LOG + "login succeeded");
          console.log(user);
        }

        // login failed 
        else {
          console.log(LOG + "login failed, user info incorrect");
        }
      });
    } 

    // invalid login info
    else {
      console.log(LOG + "login failed, user info invalid");
    }
  }

  // returns true if user / email / password fields are properly set
  var validLoginInfo = function(user) {
    if (user == null) {
      return false;
    }
    if (user.email == null || user.password == null) {
      return false;
    }
    if (user.email == "" || user.password == "") {
      return false;
    }
    return true;
  }
}]);
