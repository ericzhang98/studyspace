var myApp = angular.module("signupApp", []);

myApp.controller("SignUpController", ["$scope", "$http",
    function($scope, $http) {
      console.log("SWAG");

      /* Sign Up Error Checking */
      $scope.signup = function(name, school, email, password, confirmPassword) {
        //error checking
        if (name) {
          $scope.nameMessage = "";
        }
        else {
          $scope.nameMessage = "(Field Required)";
        }

        if (school) {
          $scope.schoolMessage = "";
        }
        else {
          $scope.schoolMessage = "(Field Required)";
        }

        if (email) {
          $scope.emailMessage = "";
        }
        else {
          $scope.emailMessage = "(Field Required)";
        }

        if (!password) {
          $scope.passwordMessage = "(Field Required)";
        }

        if (!confirmPassword) {
          $scope.confirmMessage = "(Field Required)";
        }

        if (password && confirmPassword) {
          if (password.length >= 6) {
            if (password === confirmPassword) {
              if (name && school && email ) {
                console.log(Sha1.hash(password));
                var newUser = new User(email, Sha1.hash(password), name, school);
                console.log("Attempting signup with:");
                console.log(newUser);
                postSignupInfo(newUser);
              }
            }
            else {
              $scope.passwordMessage = "(Passwords don't match)";
              $scope.confirmMessage  = "(Passwords don't match)";
            }
          }
          else {
            $scope.passwordMessage = "(Password need >6 characters)";
            $scope.confirmMessage  = "";
          }
        }
        else {
          $scope.passwordMessage = "(Passwords don't match)";
          $scope.confirmMessage  = "(Passwords don't match)";
        }
        //$(".msg-error").removeClass("hide");
      }

      function postSignupInfo(newUser) {
        $http.post("/accountsignup", newUser).then(function(res) {
          if (res.data.success) {
            console.log("Create success!");
            //$scope.successMessage = "Account successfully created!";

            document.location.href = "main";
          }
          else {
            console.log("Failed!");
            $scope.emailMessage = "(Account already exists)";

            $scope.nameMessage     = "";
            $scope.schoolMessage   = "";
            $scope.passwordMessage = "";
            $scope.confirmMessage  = "";
            //$(".msg-error").removeClass("hide");
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
