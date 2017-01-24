// server.js will be our website's server that handles communication
// between the front-end and the database


/* SETUP ---------------------------------------------------------------*/
// - Express is a Node framework that makes everything easier
// - require returns a 'module', which is essentially an object
// packed with functions
var express = require('express');
var app = express();

// - Mongodb is the database that we will be using
// - mongojs is a module that has some useful functions
var mongojs = require('mongojs');
var db = mongojs('users', ['users']); // we want the 'users' database

// - body-parser is middle-ware that parses http objects
// or something to that effect (don't worry about it)
var bodyParser = require('body-parser');

// - app configuration
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json());
/*-----------------------------------------------------------------------*/




/* HTTP requests ---------------------------------------------------------*/

// returns all users, not useful atm
/*app.get('/users', function(req, res) {
  console.log(LOG + "get users");
  db.users.find(function (err, docs) {
    console.log(LOG + docs);
    res.json(docs);
  })
});*/

// returns user with given email / password
app.post('/accountlogin', function(req, res) {
  var email = req.body.email;
  var password = req.body.password;
  console.log("get user with email " + email + " and pass " + password);
  db.users.findOne({email: email, password: password}, function (err, doc) {
    res.json(doc);
  });
});


/* POST data: New account info with {email, password}
 * Returns: {success} - whether or not it succeeded */
app.post("/accountsignup", function(req, res) {
  var email = req.body.email;
  var password = req.body.password;
  console.log("Account signup: attempt with - " + email);
  db.users.findOne({email:email}, function (err, doc) {
    //if user doesn't exist yet (doc is null), insert it in
    if (!doc) {
      var newUser = new User(email, password);
      db.users.insert(newUser, function(err, doc) {
        if (doc) {
          console.log("Account signup: ACCOUNT CREATED");
          res.json({success: true});
        }
        else {
          console.log("Account signup: SOMETHING WEIRD HAPPENED");
          res.json({success: true});
        }
      });
    }
    else {
      console.log("Account signup: error - account already exists");
      res.json({success: false});
    }
  });
});

app.get("/accountverify/:id/:token", function(req, res) {
  var id = req.params.id;
  var token = req.params.token;
  if (id.length == 24) {
    db.users.findOne({_id: mongojs.ObjectId(id)}, function (err, doc) {
      //check if user exists
      if (doc) {
        //verify the user if the token matches
        console.log(doc);
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
});


/*------------------------------------------------------------------------*/


/* Model -----------------------------------------------------------------*/

function User(email, password) {
  this.email = email;
  this.password = password;
  this.token = "dank";
  this.active = false; //has verified email
}

/*------------------------------------------------------------------------*/


/* Helper methods --------------------------------------------------------*/

function sendVerifyError(res) {
  res.json({success:false});
}

function generateToken() {
  var token = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for( var i=0; i < 10; i++ ) {
    token += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return token;
}

/*------------------------------------------------------------------------*/


app.listen(3000);
console.log("Server running on port 3000");
