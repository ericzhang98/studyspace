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


  this.signup = function(name, school, email, password, res) {

    console.log("Account signup: attempt with - " + email);
    db.users.findOne({email:email}, function (err, doc) {
      //if user doesn't exist yet (doc is null), insert it in
      if (!doc) {
        var newUser = new User(email, password, name, school);
        db.users.insert(newUser, function(err, doc) {
          if (doc) {
            console.log("Account signup: ACCOUNT CREATED");
            //sendVerifyEmail(newUser);
            res.cookie("user_id", doc.user_id, {signed: true, maxAge: COOKIE_TIME});
            res.cookie("email", doc.email, {signed: true, maxAge: COOKIE_TIME});
            res.cookie("name", doc.name, {signed: true, maxAge: COOKIE_TIME});
            res.json({success: true});
          }
          else {
            console.log("Account signup: SOMETHING WEIRD HAPPENED");
            res.json({success: true});
          } });
      }
      else {
        console.log("Account signup: error - account already exists");
        res.json({success: false});
      }
    });

  }


  this.login = function(email, password, res) {
    db.users.findOne({email: email, password: password}, function (err, doc) {
      if (doc) {
        console.log("LOGIN: " + email);
        res.cookie("user_id", doc.user_id, {signed: true, maxAge: COOKIE_TIME});
        res.cookie("email", doc.email, {signed: true, maxAge: COOKIE_TIME});
        res.cookie("name", doc.name, {signed: true, maxAge: COOKIE_TIME});
      }
      res.json(doc);
    });
  }




  this.verify = function(id, token, res) {
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
                  res.json({success:true});
                }
                else {
                  console.log("WEIRD ASS ERROR - ACCOUNT EXISTS, BUT CAN'T MODIFY");
                  sendVerifyError(res);
                }
              });
          }
          //either some guy tryna hack or some typo happened
          else {
            console.log("Account verification: error - wrong token");
            sendVerifyError(res);
          }
        }
        //either some guy tryna hack or some typo happened
        else {
          console.log("Account verification: error - non-existent account");
          sendVerifyError(res);
        }
      });
    }
    else {
      console.log("Account verification: error - impossible ID");
      sendVerifyError(res);
    }
  }


  this.sendForgotPassword = function(email, res) {

    db.users.findOne({email: email}, function(err, doc) {
      //check if user with email exists
      if (doc) {
        db.users.findAndModify({query: {email: email},
          update: {$set: {resetToken: generateToken()}}, new: true}, function(err, doc) {
            if (doc) {
              console.log("Account forgot password: sending reset link");
              sendForgotPassword(doc);
              res.send({success:true});
            }
            else {
              console.log("WEIRD ASS ERROR - ACCOUNT EXISTS, BUT CAN'T MODIFY");
              res.send({success:false});
            }
          });
      }
      else {
        console.log("Account forgot password: error - account with email doesn't eixsts");
        res.send({success:false});
      }
    });
  }


  this.resetPassword = function(user_id, currPassword, newPassword, res) {
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
                  res.json({success:true});
                }
                else {
                  console.log("WEIRD ASS ERROR - ACCOUNT EXISTS, BUT CAN'T MODIFY");
                  res.json({success:false});
                }
              });
          }
          else {
            console.log("Account reset password: error - incorrect current password or non-matching new/confirm password");
            res.json({success:false});
          }
        }
        else {
          console.log("Account reset password: error - non-existent account");
          res.json({success:false});
        }
      });
    }
    else {
      console.log("Account reset password: error - impossible ID");
      res.json({success:false});
    }
  }







  this.enroll = function(user_id, class_ids, res) {
    db.users.update({user_id: user_id},
                    {$set: {class_ids: class_ids}}, function (err, doc) {
      res.send({success: doc != null});
    });
  }








};

module.exports = new accountManager();
