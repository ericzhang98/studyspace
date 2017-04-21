var accountManager = function() {


  var mongojs = require('mongojs');
  var db = mongojs('mongodb://studyspace:raindropdroptop@ds033086.mlab.com:33086/studyspace', []);

  var COOKIE_TIME = 7*24*60*60*1000; //one week

  function User(email, password, name, school) {
    //this._id = whatever mongo gives us
    this.user_id = generateToken(20);
    this.email = email;
    this.password = password;
    this.name = name;
    this.school = school;
    this.token = "dank"; //generateToken();
    this.active = true; //has verified email
  }

  function generateToken(num) {
    var token = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    if (num && num > 0) {
      for(var i = 0; i < num; i++ ) {
        token += possible.charAt(Math.floor(Math.random() * possible.length));
      }
    }
    else {
      for(var i = 0; i < 10; i++ ) {
        token += possible.charAt(Math.floor(Math.random() * possible.length));
      }
    }
    return token;
  }


  this.signup = function(name, school, email, password, callback) {
    console.log("Account signup: attempt with - " + email);
    db.users.findOne({email:email}, function (err, doc) {
      //if user doesn't exist yet (doc is null), insert it in
      if (!doc) {
        var newUser = new User(email, password, name, school);
        db.users.insert(newUser, function(err, doc) {
          if (doc) {
            console.log("Account signup: ACCOUNT CREATED");
            //sendVerifyEmail(newUser); NEED TO ADD MODULE STUFF
            callback(null, {user_id: doc.user_id, email: doc.email, name: doc.name});
          }
          else {
            console.log("Account signup: SOMETHING WEIRD HAPPENED");
            callback("error", null);
          } });
      }
      else {
        console.log("Account signup: error - account already exists");
        callback("error", null);
      }
    });
  }


  this.login = function(email, password, callback) {
    db.users.findOne({email: email, password: password}, function (err, doc) {
      if (doc) {
        console.log("LOGIN: " + email);
        callback(null, {user_id: doc.user_id, email: doc.email, name: doc.name});
      }
      else {
        callback("error", null);
      }
    });
  }




  this.verify = function(id, token, callback) {
    if (id.length == 24) {
      db.users.findOne({_id: mongojs.ObjectId(id)}, function(err, doc) {
        //check if user exists
        if (doc) {
          //verify the user if the token matches
          if (token == doc.token) {
            db.users.findAndModify({query: {_id: mongojs.ObjectId(id)}, 
              update: {$set: {active: true}}, new: true}, function(err, doc) {
                if (doc) {
                  console.log("Account verification: ACCOUNT VERIFIED");
                  callback(null, {success: true});
                }
                else {
                  console.log("WEIRD ASS ERROR - ACCOUNT EXISTS, BUT CAN'T MODIFY");
                  callback("error", null);
                }
              });
          }
          //either some guy tryna hack or some typo happened
          else {
            console.log("Account verification: error - wrong token");
            callback("error", null);
          }
        }
        //either some guy tryna hack or some typo happened
        else {
          console.log("Account verification: error - non-existent account");
          callback("error", null);
        }
      });
    }
    else {
      console.log("Account verification: error - impossible ID");
      callback("error", null);
    }
  }


  this.sendForgotPassword = function(email, callback) {

    db.users.findOne({email: email}, function(err, doc) {
      //check if user with email exists
      if (doc) {
        db.users.findAndModify({query: {email: email},
          update: {$set: {resetToken: generateToken()}}, new: true}, function(err, doc) {
            if (doc) {
              console.log("Account forgot password: sending reset link");
              sendForgotPassword(doc);
              callback(null, {success: true});
            }
            else {
              console.log("WEIRD ASS ERROR - ACCOUNT EXISTS, BUT CAN'T MODIFY");
              callback(null, {success: false});
            }
          });
      }
      else {
        console.log("Account forgot password: error - account with email doesn't eixsts");
        callback(null, {success: false});
      }
    });
  }


  //SHOULD RENAME TO CHANGE PASSWORD
  this.resetPassword = function(user_id, currPassword, newPassword, callback) {
    if (user_id) {
      db.users.findOne({user_id: user_id}, function(err, doc) {
        //check if user exists
        if (doc) {
          //verify the user if the token matches
          if (currPassword == doc.password) {
            db.users.findAndModify({query: {user_id: user_id}, 
              update: {$set: {password: newPassword}}, new: true}, function(err, doc) {
                if (doc) {
                  console.log("Account reset password: password reset");
                  callback(null, {success: true});
                }
                else {
                  console.log("WEIRD ASS ERROR - ACCOUNT EXISTS, BUT CAN'T MODIFY");
                  callback(null, {success: false});
                }
              });
          }
          else {
            console.log("Account reset password: error - incorrect current password or non-matching new/confirm password");
            callback(null, {success: false});
          }
        }
        else {
          console.log("Account reset password: error - non-existent account");
          callback(null, {success: false});
        }
      });
    }
    else {
      console.log("Account reset password: error - impossible ID");
      callback(null, {success: false});
    }
  }

  this.enroll = function(user_id, class_ids, callback) {
    db.users.update({user_id: user_id},
                    {$set: {class_ids: class_ids}}, function (err, doc) {
      if (doc) {
        callback(null, {success: true});
      }
      else {
        callback(null, {success: false});
      }
    });
  }

  this.getMyClasses = function(user_id, callback) {
    db.users.findOne({user_id: user_id}, function (err, doc) {
      if (doc) {
        //res.send({class_ids: doc.class_ids});
        callback(null, {class_ids: doc.class_ids});
      }
      else {
        //res.send({class_ids: []});
        callback(null, {class_ids: []});
      }
    });
  }



  /* ADD A MAILER.JS MODULE
  //sends a verification email to user
  function sendVerifyEmail(user, callback) {
  var receiver = user.email;
  var id = user._id;
  var token = user.token;
  var emailText = "http://localhost:3000/accountverify/" + id + "/" + token;
  var verifyEmailOptions = {
  from: "studyspacehelper@gmail.com",
  to: receiver, 
  subject: "Account verification",
  text: emailText,
  html: "<a href='" + emailText + "'>" + emailText + "</a>"
  };
  mailTransporter.sendMail(verifyEmailOptions, callback);
  }

  function sendResetPassword(user, callback) {
  var receiver = user.email;
  var id = user._id;
  var resetToken = user.resetToken;
  var emailText = "http://localhost:3000/resetpassword/" + id + "/" + resetToken;
  var resetPasswordEmailOptions = {
  from: "studyspacehelper@gmail.com",
  to: receiver,
  subject: "Password reset",
  text: emailText,
  html: "<a href='" + emailText + "'>" + emailText + "</a>"
  };
  mailTransporter.sendMail(resetPasswordEmailOptions, callback);
  }
  */



};

module.exports = new accountManager();
