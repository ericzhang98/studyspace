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
var db_classes = mongojs("classes", ["classes"]); 
var db_rooms = mongojs("rooms", ["rooms"]); //yung flat data

// - body-parser is middle-ware that parses http objects,
// or something to that effect (don't worry about it)
var bodyParser = require('body-parser');

// - email stuff
var nodemailer = require("nodemailer");
var mailTransporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {user: "studyspacehelper@gmail.com", pass: "raindropdroptop"} 
});

// - Peer server stuff
var ExpressPeerServer = require('peer').ExpressPeerServer;
var server = require('http').createServer(app);
app.use('/peerjs', ExpressPeerServer(server, {debug: true}));
server.listen(9000);

// - app configuration
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json());
/*-----------------------------------------------------------------------*/

var MAIN_HOST = "mainhost";
var ADMIN_KEY = "ABCD"
var classes_dict = {};
classes_dict["ucsd_cse_110_1"] = new Class("ucsd_cse_110_1", "CSE 110 Gillespie", []);
classes_dict["ucsd_cse_105_1"] = new Class("ucsd_cse_105_1", "CSE 105 Tiefenbruck", []);
var rooms_dict = {};

/* HTTP requests ---------------------------------------------------------*/

// forces the name property to be unique in user_classes collection
//db.user_classes.createIndex({name: 1}, {unique:true});

app.post('/user_classes', function(req, res) {

	db.user_classes.insert(req.body, function(err, docs){
		db.user_classes.ensureIndex({name: req.body}, {unique:true});
		res.json(docs);
	});	

});

app.delete('/user_classes/:id', function(req, res){

	var id = req.params.id;
	db.user_classes.remove({_id: mongojs.ObjectId(id)}, function(err, doc){
		res.json(doc);
	});
});

//NOTE:Need to get userID working so it only gets the classes of this user
app.get('/user_classes/:id', function(req, res) {

	db.user_classes.find({user_id: req.params.id}, function(err, docs){
		res.json(docs);
	});
});

app.get('/add_tutor/:class_id/:tutor_id/:admin_key', function (req, res) {
	var class_id = req.params.class_id;
	var tutor_id = req.params.tutor_id;
	var admin_key = req.params.admin_key;

	// if the admin_key is correct
	if (admin_key == ADMIN_KEY) {

		// if the tutor is not already a tutor for this class
		if (classes_dict[class_id].tutor_ids.indexOf(tutor_id) == -1) {
			classes_dict[class_id].tutor_ids.push(tutor_id);
		}

		// back up tutor in database
	}
});

/*************************************************************************************/

/******************************** GET CLASSES & ROOMS ********************************/

// return class_ids
app.get('/get_classes/:user_id', function(req, res) {
	var user_id = req.params.user_id;
	db.users.findOne({user_id: user_id}, function (err, doc) {
    	res.send({class_ids: doc.class_ids});
  	});
});

// return name of the class
app.get('/get_class/:class_id', function(req, res) {
	var class_id = req.params.class_id;

	// look up name in mongoDB
	db_classes.classes.findOne({class_id: class_id}, function (err, doc) {
		res.send({name: doc.name});
	});
});
/*************************************************************************************/

/*************************************** ROOMS ***************************************/

app.get('/add_room/:class_id/:room_name/:host_id/:is_lecture', function(req, res) {
	var room_id = addRoom(req.params.class_id, req.params.room_name, 
		req.params.host_id, req.params.is_lecture, function(json){res.send(json);});
	res.send({room_id: room_id});
})

// - adds user_id to room with id room_id
// - returns list of user_id's in that room
app.get('/join_room/:room_id/:user_id', function(req, res) {

	var room_id = req.params.room_id;
	var user_id = req.params.user_id;
	console.log("Adding user " + user_id + " to room " + room_id);

  /*
	if (!(room_id in rooms_dict)) {
		console.log("room no longer exists");
		res.send({id: null});
		return;
	}

	// add the userID to the room if it doesn't already contain it
	if (rooms_dict[room_id].users.indexOf(user_id) == -1) {
		(rooms_dict[room_id].users).push(user_id);

		// if the room didn't have a tutor before, check if it has one now
		if (!rooms_dict[room_id].has_tutor) {			
			rooms_dict[room_id].has_tutor = tutorInRoom(rooms_dict[room_id]);
		}
	}
  */
	
  db_rooms.rooms.findAndModify({query: {room_id: room_id},
      update: {$addToSet: {users: user_id}}, upsert: true, new: true}, function(err, doc) {
        if (doc) {
          console.log("DATABASE: Successfully added user " + user_id + " to room" + room_id);
        }
        else {
          console.log("DATABASE: Failed - Didn't add user");
          console.log("Error message if it helps: " + err);
        }
        //console.log(doc);
        res.send(doc);
  }); 
	

	logRooms();

	// send back the room
	//res.send(rooms_dict[room_id]);
})

// - removes user_id from room with id room_id
app.get('/leave_room/:room_id/:user_id', function(req, res) {
	
	var room_id = req.params.room_id;
	var user_id = req.params.user_id;
	console.log("Removing user " + user_id + " from room " + room_id);

  /*
	if (!(room_id in rooms_dict)) {
		console.log("room no longer exists");
		res.send({});
		return;
	}

	// remove the userID from the room if it does already contain it
	var index = rooms_dict[room_id].users.indexOf(user_id);
	if (index > -1) {
    	rooms_dict[room_id].users.splice(index, 1);

    	// if the room had a tutor before, check if it has one now
    	if (rooms_dict[room_id].has_tutor) {
			rooms_dict[room_id].has_tutor = tutorInRoom(rooms_dict[room_id]);
		}
	}
  */

  db_rooms.rooms.findAndModify({query: {room_id: room_id},
      update: {$pull: {users: user_id}}, new: true}, function(err, doc) {
        if (doc) {
          console.log("DATABASE: Successfully removed user " + user_id + " from room" + room_id);
          if (doc.users.length == 0 && doc.host_id != MAIN_HOST) {
            removeRoom(room_id);
          }
        }
        else {
          console.log("DATABASE: Failed - Didn't remove user");
          console.log("Error message if it helps: " + err);
        }
        //console.log(doc);
        res.send({});
  });

	logRooms();

  /*
	// if the room is empty and is not a main room, remove the room
	if (rooms_dict[room_id].users.length == 0 && rooms_dict[room_id].host_id != MAIN_HOST) {
		removeRoom(room_id);
	}
  */

	// without this res.send, server.js will not allow leave_room to be spammed
	// so leaving rooms constantly will not work
	//res.send({});
})







/* Account system (login, signup, verification) -----*/

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
//this._id = whatever mongo gives us
  this.email = email;
  this.password = password;
  this.token = "dank"; //generateToken();
  this.active = true; //has verified email
}

//TODO ISAAC: change id to class_id
function Class(class_id, class_name) {
	this.class_id = class_id;	// "ucsd_cse_110_1"
	this.name = class_name; // "CSE 110 Gillespie"
	this.room_ids = [];
}

//TODO ISAAC: change id to room_id 
function Room(room_id, room_name, room_host_id, class_id, is_lecture) {
	this.room_id = room_id;
	this.name = room_name;
	this.host_id = room_host_id;
	this.class_id = class_id;
	this.is_lecture = is_lecture;
	this.has_tutor = false;
}

function addRoom(class_id, room_name, room_host_id, is_lecture, callback) {
	/*
	var room_id = class_id + "_r" + classes_dict[class_id].room_ids.length; // rmain, r1, r2, etc

	roomInfoDatabase.child(room_id).push().set(newRoom);

	classRoomsDatabase.child(class_id).push().set(room_id);

	return room_id;

	logClassesAndRooms();*/

}

function removeRoom(room_id) {
	console.log("removing room with id " + room_id);
	roomInfoDatabase.child(room_id).child("class_id")
  /*
	// id of the class this room belongs to
	var class_id = rooms_dict[room_id].class_id;

	// remove the room_id from the class
	var index = classes_dict[class_id].room_ids.indexOf(room_id);
	classes_dict[class_id].room_ids.splice(index, 1);

	// remove the room from rooms_dict
	delete rooms_dict[room_id];
  */


  db_rooms.rooms.findOne({room_id:room_id}, function(err, doc) {
    if (doc) {
      //Class database --> find the class object with {class_id} --> modify the object's
      //{room_ids} property (an array of room ids) to remove the room's id
      db_classes.classes.findAndModify({query: {class_id: doc.class_id},
          update: {$pull: {room_ids: room_id}}, new: true}, function(err, doc) {
            if (doc) {
              console.log("DATABASE: Successfully removed roomid " + room_id + " from class " + doc.class_id);
            }
            else {
              console.log("DATABASE: Failed - Didn't remove roomid");
              console.log("Error message if it helps: " + err);
            }
            //console.log(doc);
      });

      //Rooms database --> delete the room from database
      db_rooms.rooms.remove({room_id: room_id}, function(err, doc) {
        if (doc) {
          console.log("DATABASE: Room " + room_id  + " succesfully deleted from rooms database");
        }
        else {
          console.log("DATABASE: Failed - Didn't delete room from rooms database");
          console.log("Error message if it helps: " + err); 
        }
        //console.log(doc);
      });

    }
    else {
      console.log("Error when deleting room");
    }

  });




	logClassesAndRooms();
}

function tutorInRoom(room) {
	for (user_id in room.users) {
		for (tutor_id in classes_dict[room.class_id].tutor_ids) {
			if (user_id = tutor_id) {
				return true;
			}
		}
	}
	return false;
}

function generateMainRooms() {
	/*
	console.log("generating main rooms");
	for (var class_id in classes_dict) {
		addRoom(class_id, "main", MAIN_HOST, false);
	}*/
}

function logClassesAndRooms() {
  /*
	console.log("******************** CLASSES ********************")
	console.log(classes_dict);
	console.log("*************************************************")	
	logRooms();	
  */
}

function logRooms() {
  /*
	console.log("******************** ROOMS **********************")
	console.log(rooms_dict);
	console.log("*************************************************")	
  */
}


/* Class/room database methods--------*/

function addRoomIDToClass(class_id, room_id) {

}

function addRoomToDatabase(room) {

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
generateMainRooms();
