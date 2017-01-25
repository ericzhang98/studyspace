var myApp = angular.module("signupApp", []);

myApp.controller("SignUpController", ["$scope", "$http",
    function($scope, $http) {
      console.log("SWAG");

      /* Attempts to sign up with email and password params, updates
       * {{successMessage}} with whether or not it succeeded */
      $scope.signUp = function(userEmail, userPassword) {
        if (userEmail && userPassword) { //TODO:extra checks on email @edu + password length
          console.log("Creating account with: " + userEmail + "; " + userPassword);
          var newUser = {email: userEmail, password: userPassword};
          console.log(newUser);

          $http.post("/accountsignup", newUser).then(function(res) {
            if (res.data.success) {
              console.log("Create success!");
              $scope.successMessage = "Account successfully created!";
            }
            else {
              console.log("Failed!");
              $scope.successMessage = "Failed! Account already exists";
            }
          });
        }

        else {
          $scope.successMessage = "Fill out the fields, dumbass";
        }
      };

    }]);

myApp.controller("TestController", ["$scope", "$http",
    function($scope, $http) {
      console.log("woot");

      $scope.dank = "WOOT";
    }]);
