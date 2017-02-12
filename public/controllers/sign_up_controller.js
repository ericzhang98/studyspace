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
              console.log(Sha1.hash(password));
              var newUser = new User(email, Sha1.hash(password), name, school);
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
            

            document.location.href = "main";
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


/*
      function sha1(msg, options) {
          var defaults = { msgFormat: 'string', outFormat: 'hex' };
          var opt = Object.assign(defaults, options);

          switch (opt.msgFormat) {
              default: // default is to convert string to UTF-8, as SHA only deals with byte-streams
              case 'string':   msg = utf8Encode(msg);       break;
              case 'hex-bytes':msg = hexBytesToString(msg); break; // mostly for running tests
          }

          // constants [§4.2.1]
          var K = [ 0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xca62c1d6 ];

          // initial hash value [§5.3.1]
          var H = [ 0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0 ];

          // PREPROCESSING [§6.1.1]

          msg += String.fromCharCode(0x80);  // add trailing '1' bit (+ 0's padding) to string [§5.1.1]

          // convert string msg into 512-bit/16-integer blocks arrays of ints [§5.2.1]
          var l = msg.length/4 + 2; // length (in 32-bit integers) of msg + ‘1’ + appended length
          var N = Math.ceil(l/16);  // number of 16-integer-blocks required to hold 'l' ints
          var M = new Array(N);

          for (var i=0; i<N; i++) {
              M[i] = new Array(16);
              for (var j=0; j<16; j++) {  // encode 4 chars per integer, big-endian encoding
                  M[i][j] = (msg.charCodeAt(i*64+j*4)<<24) | (msg.charCodeAt(i*64+j*4+1)<<16) |
                      (msg.charCodeAt(i*64+j*4+2)<<8) | (msg.charCodeAt(i*64+j*4+3));
              } // note running off the end of msg is ok 'cos bitwise ops on NaN return 0
          }
          // add length (in bits) into final pair of 32-bit integers (big-endian) [§5.1.1]
          // note: most significant word would be (len-1)*8 >>> 32, but since JS converts
          // bitwise-op args to 32 bits, we need to simulate this by arithmetic operators
          M[N-1][14] = ((msg.length-1)*8) / Math.pow(2, 32); M[N-1][14] = Math.floor(M[N-1][14]);
          M[N-1][15] = ((msg.length-1)*8) & 0xffffffff;

          // HASH COMPUTATION [§6.1.2]

          for (var i=0; i<N; i++) {
              var W = new Array(80);

              // 1 - prepare message schedule 'W'
              for (var t=0;  t<16; t++) W[t] = M[i][t];
              for (var t=16; t<80; t++) W[t] = ROTL(W[t-3] ^ W[t-8] ^ W[t-14] ^ W[t-16], 1);

              // 2 - initialise five working variables a, b, c, d, e with previous hash value
              var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4];

              // 3 - main loop (use JavaScript '>>> 0' to emulate UInt32 variables)
              for (var t=0; t<80; t++) {
                  var s = Math.floor(t/20); // seq for blocks of 'f' functions and 'K' constants
                  var T = (ROTL(a,5) + f(s,b,c,d) + e + K[s] + W[t]) >>> 0;
                  e = d;
                  d = c;
                  c = ROTL(b, 30) >>> 0;
                  b = a;
                  a = T;
              }

              // 4 - compute the new intermediate hash value (note 'addition modulo 2^32' – JavaScript
              // '>>> 0' coerces to unsigned UInt32 which achieves modulo 2^32 addition)
              H[0] = (H[0]+a) >>> 0;
              H[1] = (H[1]+b) >>> 0;
              H[2] = (H[2]+c) >>> 0;
              H[3] = (H[3]+d) >>> 0;
              H[4] = (H[4]+e) >>> 0;
          }

          // convert H0..H4 to hex strings (with leading zeros)
          for (var h=0; h<H.length; h++) H[h] = ('00000000'+H[h].toString(16)).slice(-8);

          // concatenate H0..H4, with separator if required
          var separator = opt.outFormat=='hex-w' ? ' ' : '';

          return H.join(separator);
      };
      function utf8Encode(str) {
          return unescape(encodeURIComponent(str));
      };

      function hexBytesToString(hexStr) {
          hexStr = hexStr.replace(' ', ''); // allow space-separated groups
          var str = '';
          for (var i=0; i<hexStr.length; i+=2) {
              str += String.fromCharCode(parseInt(hexStr.slice(i, i+2), 16));
          }
          return str;
      };
      function f(s, x, y, z)  {
          switch (s) {
              case 0: return (x & y) ^ (~x & z);           // Ch()
              case 1: return  x ^ y  ^  z;                 // Parity()
              case 2: return (x & y) ^ (x & z) ^ (y & z);  // Maj()
              case 3: return  x ^ y  ^  z;                 // Parity()
          }
      };

      function ROTL(x, n) {
          return (x<<n) | (x>>>(32-n));
      };
*/
