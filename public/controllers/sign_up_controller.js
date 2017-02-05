var myApp = angular.module("signupApp", []);

myApp.controller("SignUpController", ["$scope", "$http",
    function($scope, $http) {
      console.log("SWAG");

      /* Attempts to sign up with email and password params, updates
       * {{successMessage}} with whether or not it succeeded */
      $scope.basicSignup = function(userEmail, userPassword) {
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
              $(".msg-error").removeClass("hide");
            }
          });
        }

        else {
          $scope.successMessage = "Fill out the fields, dumbass";
        }
      };

      $scope.signup = function(name, school, email, password, confirmPassword) {
        //error checking
        if (name && school && email && password && confirmPassword) {
          if (password.length >= 6) {
            if (password === confirmPassword) {
              var newUser = new User(email, password, name, school);
              console.log("Attempting signup with:");
              console.log(newUser);
              postSignupInfo(newUser);
            }
            else {
              $scope.successMessage = "Passwords don't match";
              $(".msg-error").removeClass("hide");
            }
          }
          else {
            $scope.successMessage = "Password needs at least 6 characters";
            $(".msg-error").removeClass("hide");
          }
        }
        else {
          $scope.successMessage = "Ayyylmao fill out the fields";
          $(".msg-error").removeClass("hide");
        }

      }

      function postSignupInfo(newUser) {
        $http.post("/accountsignup", newUser).then(function(res) {
          if (res.data.success) {
            console.log("Create success!");
            $scope.successMessage = "Account successfully created!";
          }
          else {
            console.log("Failed!");
            $scope.successMessage = "Failed! Account already exists";
            $(".msg-error").removeClass("hide");
          }
        });
      }

      function User(email, password, name, school) {
      //this._id = whatever mongo gives us
        this.email = email;
        this.password = password;
        this.name = name;
        this.school = school;
        this.token = "dank"; //generateToken();
        this.active = true; //has verified email
      }

    }]);

myApp.controller("TestController", ["$scope", "$http",
    function($scope, $http) {
      console.log("woot");

      $scope.dank = "WOOT";
    }]);
