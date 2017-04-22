// log_in_controller.js will be a front-end javascript that
// runs on the Log In page and communicates with server.js

// used for log messages
var LOG = "log_in_controller: "

// defining the controller
angular.module('loginApp', []).controller('loginController', ['$scope', '$http', function($scope, $http) {


  // - attempts to login
  $scope.attemptLogin = function(email, password) {
    //console.log(LOG + "attemptLogin");
    var loginAttempt = {email: email, password: Sha1.hash(password)};

    // valid login info
    if (validLoginInfo(loginAttempt)) {

      // verify email / password
      $http.post("/accountlogin", loginAttempt).then(function(res) {
        var user = res.data.user

        // login returned a user
        // check if user activated account or not
        if (user) {
          $scope.emailMessage = "";
          $scope.passwordMessage = "";
          window.location.href = "/";
        }

        // login failed 
        else {
          //console.log(LOG + "login failed, user info incorrect");
          $scope.emailMessage = "(Invalid email or password)";
          $scope.passwordMessage = "(Invalid email or password)";
        }
      });
    } 

    // invalid login info
    else {
      //console.log(LOG + "login failed, user info invalid");
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
