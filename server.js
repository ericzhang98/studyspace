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

// - app configuration
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

var class_to_rooms_dict = {};
class_to_rooms_dict["ucsd_cse_110"] = ["ucsd_cse_110_1"];
class_to_rooms_dict["ucsd_cse_105"] = ["ucsd_cse_105_1", "ucsd_cse_105_2"];

var room_to_users_dict = {};
room_to_users_dict["ucsd_cse_110_1"] = [];
room_to_users_dict["ucsd_cse_105_1"] = [];
room_to_users_dict["ucsd_cse_105_2"] = [];

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

app.get('/leave_room/:room_id/:user_id', function(req, res) {
	var room_id = req.params.room_id;
	var user_id = req.params.user_id;
	console.log("Adding user " + user_id + " to room " + room_id);

	// remove the userID from the room if it does already contain it
	var index = room_to_users_dict[room_id].indexOf(user_id);
	if (index > -1) {
    	room_to_users_dict[room_id].splice(index, 1);
	}
})

// returns user with given email / password
app.post('/users', function(req, res) {
  var email = req.body.email;
  var password = req.body.password;
  console.log("get user with email " + email + " and pass " + password);
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
