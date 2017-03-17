var myApp = angular.module("signupApp", ["loginApp"]);

myApp.controller("signupController", ["$scope", "$http",
function($scope, $http) {

  /* Sign Up Error Checking */
  $scope.signup = function(firstName, lastName, email, password, confirmPassword) {
    //console.log("checking input");

    // Name Check
    if (firstName) {
      $scope.firstNameMessage = "";
    }
    else {
      $scope.firstNameMessage = "(Field Required)";
    }

    if (lastName) {
      $scope.lastNameMessage = "";
    }
    else {
      $scope.lastNameMessage = "(Field Required)";
    }

    // Email Check
    if (email) {
      $scope.emailMessage = "";
    }
    else {
      $scope.emailMessage = "(Field Required)";
    }

    // Password Field Check
    if (!password) {
      $scope.passwordMessage = "(Field Required)";
    }

    if (!confirmPassword) {
      $scope.confirmMessage = "(Field Required)";
    }

    // Password Input Check
    if (password && confirmPassword) {
      if (password.length >= 6) {
        if (password == confirmPassword) {
          if (firstName && lastName && email ) {
            //console.log("lul");
            //console.log(Sha1.hash(password));
            var name = firstName + " " + lastName;
            var newUser = new User(email, Sha1.hash(password), name);
            //console.log("Attempting signup with:");
            //console.log(newUser);
            postSignupInfo(newUser);
          }
        }
        else { // Password and confirmation don't match
          $scope.passwordMessage = "(Passwords don't match)";
          $scope.confirmMessage  = "(Passwords don't match)";
        }
      }
      else { // Password is not >6 characters
        $scope.passwordMessage = "(Password needs >6 characters)";
        $scope.confirmMessage  = "";
      }
    }

    else { // Only one of the fields exists
      $scope.passwordMessage = "(Passwords don't match)";
      $scope.confirmMessage  = "(Passwords don't match)";
    }
  }

  function postSignupInfo(newUser) {
    $http.post("/accountsignup", newUser).then(function(res) {
      if (res.data.success) {
        //console.log("Create success!");
        window.location.href = "/";
      }

      else {
        //console.log("Failed!");
        $scope.emailMessage = "(Account already exists)";
        $scope.firstNameMessage = "";
        $scope.lastNameMessage  = "";
        $scope.schoolMessage    = "";
        $scope.passwordMessage  = "";
        $scope.confirmMessage   = "";
      }
    });
  }

  function User(email, password, name, school="UCSD") {
    //this._id = whatever mongo gives us
    this.email    = email;
    this.password = password;
    this.name     = name;
    this.school   = school;
    this.token    = "dank"; //generateToken();
    this.active   = true;   //has verified email
  }
}]);
