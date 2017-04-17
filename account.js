var accountManager = function() {


  var mongojs = require('mongojs');
  var db = mongojs('mongodb://studyspace:raindropdroptop@ds033086.mlab.com:33086/studyspace', []);



  this.signup = function(name, school, email, password, res) {

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



















};

module.exports = new accountManager();
