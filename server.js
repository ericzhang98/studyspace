// server.js will be our website's server that handles communication
// between the front-end and the database

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

// used for log messages
var LOG = "server: "

app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json());

// returns all users, not useful atm
/*app.get('/users', function(req, res) {
  console.log(LOG + "get users");
  db.users.find(function (err, docs) {
    console.log(LOG + docs);
    res.json(docs);
  })
});*/

// returns user with given email / password
app.post('/users', function(req, res) {
  var email = req.body.email;
  var password = req.body.password;
  console.log(LOG + "get user with email " + email + " and pass " + password);
  db.users.findOne({email: email, password: password}, function (err, doc) {
    res.json(doc);
  })
})


/* POST data: New account info with {email, password}
 * Returns: {success} - whether or not it succeeded */
app.post("/accountsignup", function(req, res) {
  var email = req.body.email;
  var password = req.body.password;
  console.log("Account signup attempt with: " + email);
  db.users.findOne({email:email}, function (err, doc) {
    //if user doesn't exist yet (doc is null), insert it in
    if (!doc) {
      db.users.insert(req.body, function(err, doc) {
        if (!err) {
          console.log("ACCOUNT CREATED");
          res.json({success: true});
        }
        else {
          console.log("SOMETHING WEIRD HAPPENED");
        }
      });
    }
    else {
      console.log("ACCOUNT ALREADY EXISTS");
      res.json({success: false});
    }
  });
});


app.listen(3000);
console.log("Server running on port 3000");
