// log_in_controller.js will be a front-end javascript that
// runs on the Log In page and communicates with server.js

// used for log messages
var LOG = "log_in_controller: "

// defining the controller
angular.module('loginApp', []).controller('loginController', ['$scope', '$http', function($scope, $http) {
  console.log(LOG + "started");

  // - verifyLogin looks for a user with specified info and
  // - calls onResponseReceived when it gets and response
  var verifyLogin = function(loginAttempt, onResponseReceived) {
    console.log(LOG + "verifyLogin");
    $http.post('/accountlogin', loginAttempt).then(function onSuccess(response) {
      onResponseReceived(response.data);
    })
  }

  // - attempts to login
  $scope.attemptLogin = function(email, password) {
    console.log(LOG + "attemptLogin");
    var loginAttempt = {email: email, password: Sha1.hash(password)};

    // valid login info
    if (validLoginInfo(loginAttempt)) {

      // verify email / password
      verifyLogin(loginAttempt, function(user) {

        // login returned a user
        // check if user activated account or not
        if (user != null) {
          if (user.active) { 
            console.log(LOG + "login succeeded");
            $scope.emailMessage = "";
            $scope.passwordMessage = "";
            window.location.href = "/";
          }
          else {
            console.log(LOG + "need to verify account, verify email");
            $scope.emailMessage = "(Invalid email or password)";
            $scope.passwordMessage = "(Invalid email or password)";
          }
        }

        // login failed 
        else {
          console.log(LOG + "login failed, user info incorrect");
          $scope.emailMessage = "(Invalid email or password)";
          $scope.passwordMessage = "(Invalid email or password)";
        }
      });
    } 

    // invalid login info
    else {
      console.log(LOG + "login failed, user info invalid");
      $scope.emailMessage = "(Field Required)";
      $scope.passwordMessage = "(Field Required)";
    }
  }

  // returns true if user / email / password fields are properly set
  var validLoginInfo = function(user) {
    if (user == null) {
      return false;
    }

    if (user.email == null) {
      return false;
    } 

    if (user.email == "") {
      $scope.emailMessage = "(Field Required)";
      return false;
    }

    if (user.password == null ) {
      return false;
    }

    if (user.password == "" ) {
      return false;
    }

    return true;
  }

  // Resets error messages
  $scope.reset = function() {
    $scope.emailMessage = "";
    $scope.passwordMessage = "";
    $scope.email = null;
    $scope.password = null;
  }

}]);
