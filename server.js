// server.js will be our website's server that handles communication
// between the front-end and the database


/* SETUP ---------------------------------------------------------------*/

// - Express is a Node framework that makes everything easier
// - require returns a 'module', which is essentially an object
// packed with functions
var express = require('express');
var app = express();
var socsjs = require('socsjs');

// - Mongodb is the database that we will be using
// - mongojs is a module that has some useful functions
var mongojs = require('mongojs');
var db = mongojs('mongodb://studyspace:raindropdroptop@ds033086.mlab.com:33086/studyspace', []);

// - body-parser is middle-ware that parses http objects,
// or something to that effect (don't worry about it)
var bodyParser = require('body-parser');

// - cookie-parser helps read cookies
var cookieParser = require("cookie-parser");

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

// - Firebase admin setup
var firebaseAdmin = require("firebase-admin");
var serviceAccount = require("./dontlookhere/porn/topsecret.json"); //shhhh
var firebase = firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount),
  databaseURL: "https://studyspace-490cd.firebaseio.com/"
});
var firebaseRoot = firebase.database().ref();
var classRoomsDatabase = firebaseRoot.child("ClassRooms");
var roomInfoDatabase = firebaseRoot.child("RoomInfo");
var roomMessagesDatabase = firebaseRoot.child("RoomMessages");

// - app configuration
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json());
app.use(cookieParser("raindropdroptop")); //secret key
/*-----------------------------------------------------------------------*/

var MAIN_HOST = "mainhost";
var ADMIN_KEY = "ABCD"
var PUBLIC_DIR = __dirname + "/public/";
var VIEW_DIR = __dirname + "/public/";
var COOKIE_TIME = 7*24*60*60*1000;

/* HTTP requests ---------------------------------------------------------*/


/************************************ HTML PAGES *************************************/

app.get('/', function(req, res) {
  //check login and decide whether to send login or home
  var user_id = req.signedCookies.user_id;
  if (user_id) {
    console.log("checking user credentials: " + req.signedCookies.user_id);
    db.users.findOne({user_id: user_id}, function(err, doc){
      console.log("got info");
      if (doc) {
        console.log("user logged in");
        res.sendFile(VIEW_DIR + "mainRoom.html");
      }
      else {
        res.sendFile(VIEW_DIR + "home.html");
      }
    });
  }
  else {
    res.sendFile(VIEW_DIR + "home.html");
  }
});

app.get('/signup', function(req, res) {
  res.sendFile(VIEW_DIR + "signup.html");
});

app.get('/main', function(req, res) {
  res.sendFile(VIEW_DIR + "mainRoom.html");
});

/*************************************************************************************/







/* User settings ---------------*/

app.post('/get_Id_From_Name', function(req, res) {
  var emailFind = req.body.email;
  console.log(emailFind);
  
	db.users.findOne({email:"x"}, function(err, docs){
    console.log(docs);
		res.json(docs);
	});	
});

app.post('/buddy_existing_user', function(req, res) {

  console.log(req.body.name);
	db.users.findOne({email:req.body.name}, function(err, docs){
    console.log(docs);
		res.json(docs);
	});	

});

app.post('/buddy_existing_request', function(req, res) {

  console.log(req.body.friend_id);
  var user_id = req.signedCookies.user_id;
  var friend_id = req.body.friend_id;
  db.user_buddy_requests.find(
  {$or:[{sent_from_id:user_id, sent_to_id:friend_id},
  {sent_from_id:friend_id, sent_to_id:user_id}]},
  function(err, docs){
    console.log(docs);
		res.json(docs);
	});	

});

app.post('/buddies_already', function(req, res) {

  console.log("Friendship check");
  var user_id = req.signedCookies.user_id;
  var friend_id = req.body.friend_id;
  db.user_buddies.find(
  {$or:[ {user_one_id:user_id, user_two_id:friend_id},
  {user_one_id:friend_id, user_two_id:user_id}]},
  function(err, docs){
    console.log(docs);
		res.json(docs);
	});	
});

app.post('/send_buddy_request', function(req, res) {

  req.body.sent_from_id = req.signedCookies.user_id;
	db.user_buddy_requests.insert(req.body, function(err, docs){
		res.json(docs);
	});	
});

app.post('/buddy_requests', function(req, res) {

	db.user_buddy_requests.find({sent_to_id:req.signedCookies.user_id}, function(err, docs){
    console.log(docs);
		res.json(docs);
	});	
});

app.post('/accept_buddy', function(req, res) {

  var user_one_id = req.signedCookies.user_id;
  var user_one_name = req.body.user_one_name;
  var user_two_id = req.body.user_two_id;
  var user_two_name = req.body.user_two_name;
	db.user_buddies.insert([{user_one_id:user_one_id, user_one_name:user_one_name, 
                          user_two_id:user_two_id, user_two_name:user_two_name},
                          {user_one_id:user_two_id, user_one_name:user_two_name, 
                          user_two_id:user_one_id, user_two_name:user_one_name}], function(err, docs){
    console.log(docs);
		res.json(docs);
	});	
});

app.post('/get_added_buddies', function(req, res){
  
	db.user_buddies.find({user_one_id:req.signedCookies.user_id}, function(err, docs){
		res.json(docs);
	});	
});

app.delete('/reject_buddy/:id', function(req, res){

	var id = req.params.id;
	db.user_buddy_requests.remove({_id: mongojs.ObjectId(id)}, function(err, doc){
		res.json(doc);
	});
});

app.delete('/remove_buddy/:id', function(req, res){

	var id = req.params.id;
	db.user_buddies.remove({_id: mongojs.ObjectId(id)}, function(err, doc){
		res.json(doc);
	});
});
// forces the name property to be unique in user_classes collection
//db.user_classes.createIndex({name: 1}, {unique:true});
app.post('/user_classes', function(req, res) {
  console.log(req.body);
  var get_user_id = req.signedCookies.user_id;
  db.user_classes.createIndex({name: 1}, {unique:true});
	db.user_classes.insert({name:req.body.name, user_id:get_user_id}, function(err, docs){
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
app.get('/user_classes', function(req, res) {

  var get_user_id = req.signedCookies.user_id;
	db.user_classes.find({user_id: get_user_id}, function(err, docs){
		res.json(docs);
	});
});

app.get('/scrape_classes', function(req, res) {

  var depts = ['AIP', 'AAS', 'ANES', 'ANBI', 'ANAR', 'ANTH', 'ANSC', 'AESE', 'AUD', 'BENG', 'BNFO', 'BIEB',
               'BICD','BIPN','BIBC','BGGN','BGSE','BILD','BIMM','BISP','BIOM','CMM','CENG','CHEM','CHIN','CLIN',
               'CLRE','COGS','COMM','COGR','CSE','ICAM', 'CONT','CGS','CAT','TDCH','TDHD','TDMV','TDPF','TDTR',
               'DSE','DERM','DSGN','DOC','ECON','EAP','EDS','ERC','ECE']; // TODO::ADD MORE DEPARTMENTS YOU FUCKS
 
  for (var i = 0; i < depts.length; i++) {
    var dept = depts[i];
    var quarter = 'WI17';
    var timeout = 10000;
    var undergrad = true;   // optional boolean to select only undergrad courses (< 200)
    socsjs.searchDepartment(quarter, dept, timeout, undergrad).then(function(result) {
      for (var i = 0; i < result.length; i++){
        var obj = result[i];
        console.log(obj['name']);
      }
    }).catch(function(err) {
        console.log(err, 'oops!');
    });
  }
});


/******************************** GET CLASSES & ROOMS ********************************/

// return the class_ids of classes this user is enrolled in
app.get('/get_classes/', function(req, res) {
	var user_id = req.signedCookies.user_id;
	db.users.findOne({user_id: user_id}, function (err, doc) {
	    if (doc) {
	    	res.send({class_ids: doc.class_ids});
	    }
	    else {
	      res.send({class_ids: []});
	    }
  	});
});

// return name of the class with specified id
app.get('/get_class/:class_id', function(req, res) {
	var class_id = req.params.class_id;

	// look up name in mongoDB
	db.classes.findOne({class_id: class_id}, function (err, doc) {
		res.send({name: doc.name});
	});
});
/*************************************************************************************/

/*************************************** ROOMS ***************************************/

app.get('/add_room/:class_id/:room_name/:is_lecture', function(req, res) {
  var host_id = req.signedCookies.user_id;
	var room_id = addRoom(req.params.class_id, req.params.room_name, 
		host_id, req.params.is_lecture, function(room_id){res.send(room_id);});
});

// - adds user_id to room with id room_id
// - returns list of user_id's in that room
app.get('/join_room/:room_id/', function(req, res) {

	var room_id = req.params.room_id;
	var user_id = req.signedCookies.user_id;
  joinRoom(user_id, room_id, function(roomInfo){res.send(roomInfo);});
});

// - removes user_id from room with id room_id
app.get('/leave_room/:room_id/', function(req, res) {
	
	var room_id = req.params.room_id;
	var user_id = req.signedCookies.user_id;

  leaveRoom(user_id, room_id, function(success){res.send(success);});
});

/* POST data: {chatMessage} - post chat message to firebase in respective room
 * Returns: nothing */
app.post("/send_room_message", function(req, res) {
  var roomID = req.body.roomID;
  
  //roomMessagesDatabase.child(roomID).push().set(req.body);
  if (req.signedCookies.user_id && req.signedCookies.email && req.signedCookies.name) {
    var newChatMessage = new ChatMessage(req.signedCookies.name, 
      req.signedCookies.email, req.body.text, roomID, req.body.timeSent);
    roomMessagesDatabase.child(roomID).push().set(newChatMessage);
  }

  res.send({}); //close the http request
});

/*------------------------------------------------*/






/* ACCOUNT LOGIN, SIGNUP, VERIFICATION ----------------------*/

// - returns user with given email / password
app.post('/accountlogin', function(req, res) {

  var email = req.body.email;
  var password = req.body.password;
  console.log("get user with email " + email + " and pass " + password);
  db.users.findOne({email: email, password: password}, function (err, doc) {
    res.cookie("user_id", doc.user_id, {signed: true, maxAge: COOKIE_TIME});
    res.cookie("email", doc.email, {signed: true, maxAge: COOKIE_TIME});
    res.cookie("name", doc.name, {signed: true, maxAge: COOKIE_TIME});
    res.json(doc);
    //res.sendFile(VIEW_DIR + "mainRoom.html");
  });
});

/* POST data: New account info with {email, password}
 * Returns: {success} - whether or not it succeeded */
app.post("/accountsignup", function(req, res) {
  var name = req.body.name;
  var school = req.body.school;
  var email = req.body.email;
  var password = req.body.password;
  console.log("Account signup: attempt with - " + email);
  db.users.findOne({email:email}, function (err, doc) {
    //if user doesn't exist yet (doc is null), insert it in
    if (!doc) {
      var newUser = new User(email, password, name, school);
      db.users.insert(newUser, function(err, doc) {
        if (doc) {
          console.log("Account signup: ACCOUNT CREATED");
          //sendVerifyEmail(newUser);
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
});

/* GET data: {ID of account to verify, token} - verify account with token
 * Returns: {success} - whether or not the account was verified */
app.get("/accountverify/:id/:token", function(req, res) {
  var id = req.params.id;
  var token = req.params.token;
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
});

/* POST data: {email of account to reset password} - send password reset link to email
 * Returns: {success} - whether or not password reset link was sent */
app.post("/sendforgotpassword", function(req, res) {
  var email = req.body.email;
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
});

/* GET data: {ID, resetToken} - reset password if resetToken matches
 * POST data: {password} - new password
 * Returns: {success} - whether or not password reset was succesful */
app.post("/resetpassword/:id/:resetToken", function(req, res) {
  var id = req.params.id;
  var resetToken = req.params.resetToken;
  var password = req.body.password;
  if (id.length == 24) {
    db.users.findOne({_id: mongojs.ObjectId(id)}, function(err, doc) {
      //check if user exists
      if (doc) {
        //verify the user if the token matches
        if (resetToken == doc.resetToken) {
          db.users.findAndModify({query: {_id: mongojs.ObjectId(id)}, 
            update: {$set: {password: password}}, new: true}, function(err, doc) {
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
          console.log("Account reset password: error - wrong token");
          sendVerifyError(res);
        }
      }
      else {
        console.log("Account reset password: error - non-existent account");
        sendVerifyError(res);
      }
    });
  }
  else {
    console.log("Account reset password: error - impossible ID");
    sendVerifyError(res);
  }
});

/*------------------------------------------------------------------------*/









/* Model -----------------------------------------------------------------*/

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

function Class(class_id, class_name) {
	this.class_id = class_id;	// "ucsd_cse_110_1"
	this.name = class_name; // "CSE 110 Gillespie"
}

function Room(room_id, room_name, room_host_id, class_id, is_lecture) {
	this.room_id = room_id;
	this.name = room_name;
	this.host_id = room_host_id;
	this.class_id = class_id;
	this.is_lecture = is_lecture;
	this.has_tutor = false;
}

function ChatMessage(name, email, text, roomID, timeSent) {
  this.name = name;
  this.email = email;
  this.text = text;
  this.roomID = roomID;
  this.timeSent = timeSent;
}

//TODO: ERIC - fix callback stuff so res gets sent back
function addRoom(class_id, room_name, room_host_id, is_lecture, callback) {
  var room_id = class_id + "_" + generateToken();
  console.log("FIREBASE: Attempting to add room with id " + room_id);

  var newRoom = new Room(room_id, room_name, room_host_id, class_id, is_lecture);
  var classRoomRef = classRoomsDatabase.child(class_id).push(); //push new room id into class list of rooms
  classRoomRef.set(room_id);
  console.log("FIREBASE: Successfully added roomid " + room_id + " to class " + class_id);

  //push new room info into room info database under room id
  roomInfoDatabase.child(room_id).set(newRoom, function(err) {
    if (!err) {
      console.log("FIREBASE: Room " + room_id  + " successfully inserted into RoomInfo database");
      roomInfoDatabase.child(room_id).update({firebase_push_id: classRoomRef.key}) 
      if (callback) {
        callback({room_id: room_id});
      }
    }
    else {
      console.log("FIREBASE: Error - failed to add room " + room_id + " to RoomInfo database");
      if (callback) {
        callback({room_id: null});
      }
    }
  });

}

function removeRoom(room_id) {

	console.log("FIREBASE: Attempting to remove room with id " + room_id);
  
  roomInfoDatabase.child(room_id).once("value").then(function(snapshot) {
    if (snapshot.val()) {
      var push_id = snapshot.val().firebase_push_id;
      var class_id = snapshot.val().class_id;
      classRoomsDatabase.child(class_id).child(push_id).remove(function(err) {
        roomInfoDatabase.child(room_id).remove(function(err) {
          console.log("FIREBASE: Room " + room_id  + " succesfully deleted from RoomInfo and ClassRooms");
        });
      });
          }
    else {
      console.log("FIREBASE: Failed - Didn't delete room " + room_id);
    }
  });
}

function joinRoom(user_id, room_id, callback) {
	console.log("FIREBASE: Attempting to add user " + user_id + " to room " + room_id);

  roomInfoDatabase.child(room_id).once("value").then(function(snapshot) {
    if (snapshot.val()) {
      roomInfoDatabase.child(room_id).child("users").push().set(user_id, function(err) {
        if (!err) {
          console.log("FIREBASE: Successfully added user " + user_id + " to room" + room_id);
          if (callback) { //have to grab all of room info for callback TODO: change this?
            roomInfoDatabase.child(room_id).once("value").then(function(snapshot) {
              if (callback) {
                callback(snapshot.val());
              }
            });
          }
        }
        else {
          if (callback) {
            console.log("FIREBASE: Failed - User wasn't added for some reason");
            callback(null);
          }
        }
      });
    }
    else {
      console.log("FIREBASE: Failed - Room doesn't exist anymore, user failed to join");
      if (callback) {
        callback(null);
      }
    }
  });

}

function leaveRoom(user_id, room_id, callback) {
	console.log("FIREBASE: Attempting to remove user " + user_id + " from room " + room_id);
  if (callback) {
    callback({success: true}); //assume user succesfully leaves the room
  }

  roomInfoDatabase.child(room_id).child("users").once("value").then(function(snapshot) {
    if (snapshot.val()) {
      snapshot.forEach(function(childSnapshot) {
        var key = childSnapshot.key;
        var value = childSnapshot.val();
        if (value == user_id) {
          childSnapshot.ref.remove(function(err) {
            checkToDelete(room_id);
          });
        }
      });
    }
    else {
      console.log("FIREBASE: Error - room no longer exists");
    }
  });
}

function checkToDelete(room_id) {
  console.log("FIREBASE: Checking delete conditions");
  roomInfoDatabase.child(room_id).child("users").once("value").then(function(snapshot) {
    if (!snapshot.val()) {
      console.log("FIREBASE: Attempting to delete room");
      snapshot.ref.parent.once("value").then(function(snapshot) {
        if (snapshot.val()) {
          var class_id = snapshot.val().class_id;
          var firebase_push_id = snapshot.val().firebase_push_id;
          classRoomsDatabase.child(class_id).child(firebase_push_id).remove();
          snapshot.ref.remove();
          console.log("FIREBASE: Succesfully deleted room " + room_id);
        }
        else {
          console.log("FIREBASE: Couldn't find room to delete");
        }
      });
    }
  });
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


/*------------------------------------------------------------------------*/


/* Helper methods --------------------------------------------------------*/

//send any error messages back to client
function sendVerifyError(res) {
  res.json({success:false}); //add anything needed to json
}

//generate a token of random chars
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

function checkLogin(_id, callback) {

}

/*------------------------------------------------------------------------*/


app.listen(3000);
console.log("Server running on port 3000");

//addRoom("cse110", "ucsd_cse_110_1_r0", MAIN_HOST, false);
/*addRoom("cse110", "CSE110 Trollmao", MAIN_HOST, false);
addRoom("cse110", "CSE110 Trollmao2", MAIN_HOST, false);
addRoom("cse110", "test room name", MAIN_HOST, false);*/
//removeRoom("TEST_fLOXccNn2q");
//joinRoom("ID1", "TEST_4yGGyVKzaM");
//joinRoom("ID2", "TEST_bE4iOJGtke");
//leaveRoom("ID1", "TEST_4yGGyVKzaM");
//checkToDelete("TEST_bE4iOJGtke");
