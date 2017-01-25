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

// - email stuff
var nodemailer = require("nodemailer");
var mailTransporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {user: "studyspacehelper@gmail.com", pass: "raindropdroptop"} 
});

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

var class_to_rooms_dict = {};
class_to_rooms_dict["ucsd_cse_110"] = ["ucsd_cse_110_1", "ucsd_cse_110_2"];
class_to_rooms_dict["ucsd_cse_105"] = ["ucsd_cse_105_1"];

var room_to_users_dict = {};
room_to_users_dict["ucsd_cse_110_1"] = [];
room_to_users_dict["ucsd_cse_110_2"] = [];
room_to_users_dict["ucsd_cse_105_2"] = [];

// room name
// users in the room
// room host?
// kicked from room list

// - adds user_id to room with id room_id
// - returns list of user_id's in that room
app.get('/join_room/:room_id/:user_id', function(req, res) {

	var room_id = req.params.room_id;
	var user_id = req.params.user_id;
	console.log("Adding user " + user_id + " to room " + room_id);

	// add the userID to the room if it doesn't already contain it
	if (room_to_users_dict[room_id].indexOf(user_id) == -1) {
		(room_to_users_dict[room_id]).push(user_id);
	}

	console.log(room_to_users_dict[room_id]);

	// send back the list of userID's in the room
	res.send({other_user_ids: room_to_users_dict[room_id]});
})

// - removes user_id from room with id room_id
app.get('/leave_room/:room_id/:user_id', function(req, res) {
	
	var room_id = req.params.room_id;
	var user_id = req.params.user_id;
	console.log("Removing user " + user_id + " from room " + room_id);

	// remove the userID from the room if it does already contain it
	var index = room_to_users_dict[room_id].indexOf(user_id);
	if (index > -1) {
    	room_to_users_dict[room_id].splice(index, 1);
	}

	// without this res.send, server.js will not allow leave_room to be spammed
	// so leaving rooms constantly will not work
	res.send({success: true});
})

// - returns user with given email / password
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
          //sendVerifyEmail(newUser);
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

/* GET data: {ID of account to verify, token} - verify account with token
 * Returns: {success} - whether or not the account was verified */
app.get("/accountverify/:id/:token", function(req, res) {
  var id = req.params.id;
  var token = req.params.token;
  if (id.length == 24) {
    db.users.findOne({_id: mongojs.ObjectId(id)}, function (err, doc) {
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
});


/*------------------------------------------------------------------------*/


/* Model -----------------------------------------------------------------*/

function User(email, password) {
  this.email = email;
  this.password = password;
  this.token = "dank";
  //this.token = generateToken();
  this.active = true; //has verified email
}

/*------------------------------------------------------------------------*/


/* Helper methods --------------------------------------------------------*/

//send any error messages back to client
function sendVerifyError(res) {
  res.json({success:false}); //add anything needed to json
}

//generate a token of 10 random chars
function generateToken() {
  var token = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for( var i=0; i < 10; i++ ) {
    token += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return token;
}

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

/*------------------------------------------------------------------------*/


app.listen(3000);
console.log("Server running on port 3000");
