// log_in_controller.js will be a front-end javascript that
// runs on the Log In page and communicates with server.js

// used for log messages
var LOG = "log_in_controller: "

// defining the controller
angular.module('logInApp', []).controller('LogInCtrl', ['$scope', '$http', function($scope, $http) {
  console.log(LOG + "started");

  function checkLoggedIn() {
    return (getCookie("_id") != null);
  }

  // - verifyLogin looks for a user with specified info and
  // - calls onResponseReceived when it gets a response
  var verifyLogin = function(user, onResponseReceived) {
    console.log(LOG + "verifyLogin");
    $http.post('/accountlogin', user).then(function onSuccess(response) {
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

        // login returned a user
        // check if user activated account or not
        if (user != null) {
          if (user.active) {
            console.log(LOG + "login succeeded");
            console.log(user);

            //store user info in cookie
            console.log("saving cookie too");
            storeCookie("_id", user._id);
            storeCookie("email", user.email);

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

  console.log(checkLoggedIn());

}]);



/* Cookie helper functions ---------------------------------------------------*/
/* Returns the cookie value for a key (null if no cookie with key exists) */
function getCookie(key) {
  var cookieName = key + "=";
  var cookieArray = document.cookie.split(";");
  console.log("All cookies: " + cookieArray);
  for (var i = 0; i < cookieArray.length; i++) {
    var cookie = cookieArray[i];
    while (cookie.charAt(0) == ' ') {
      cookie = cookie.substring(1);
    }
    if (cookie.indexOf(cookieName) == 0) {
      return cookie.split("=")[1];
    }
  }
  return null;
}

/* Stores a cookie with key-value at root (expires in 7 days) */
function storeCookie(key, value) {
  var expirationDate = new Date(Date.now() + 7*24*60*60*1000);
  document.cookie = key + "=" + value + ";expires=" + 
    expirationDate.toUTCString() + ";path=/";
}
/*----------------------------------------------------------------------------*/
