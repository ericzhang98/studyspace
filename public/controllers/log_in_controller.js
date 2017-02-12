// log_in_controller.js will be a front-end javascript that
// runs on the Log In page and communicates with server.js

// used for log messages
var LOG = "log_in_controller: "

// defining the controller
angular.module('logInApp', []).controller('LogInCtrl', ['$scope', '$http', function($scope, $http) {
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
            console.log(document.location.href);
            document.location.href = "main";
          }
          else {
            console.log(LOG + "need to verify account, verify email");
          }
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
