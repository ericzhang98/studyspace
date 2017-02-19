// server.js will be our website's server that handles communication
// between the front-end and the database
var deployment = false; //currently just whether or not to use HTTPS

/* SETUP ---------------------------------------------------------------*/

// - Express is a Node framework that makes everything easier
// - require returns a 'module', which is essentially an object
// packed with functions
var express = require('express');
var app = express();
var socsjs = require('socsjs');

// - Mongodb is the database that we will be using for persistent data
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

var favicon = require("serve-favicon");
app.use(favicon(__dirname + "/public/assets/images/favicon.ico"));

// - app configuration
var forceSsl = function (req, res, next) {
  if (req.headers['x-forwarded-proto'] !== 'https') {    
    return res.redirect(['https://', req.get('Host'), req.url].join(''));
  }       
  return next();           
};
if (deployment) {app.use(forceSsl);}
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json());
app.use(cookieParser("raindropdroptop")); //secret key
/*-----------------------------------------------------------------------*/

var MAIN_HOST = "mainhost";
var ADMIN_KEY = "ABCD"
var PUBLIC_DIR = __dirname + "/public/";
var VIEW_DIR = __dirname + "/public/";
var COOKIE_TIME = 7*24*60*60*1000; //one week
var MAX_IDLE = 10*1000;
var BUFFER_TIME = 20*1000;

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

app.get('/courses', function (req, res) {
  res.sendFile(VIEW_DIR + "update.html");
});

/*************************************************************************************/
app.get('/audio/:song_code', function (req, res) {
  var song_code = req.params.song_code;
  res.sendFile('/audio/' + song_code);
});






/* User settings ---------------*/

app.post('/get_Id_From_Name', function(req, res) {
  var emailFind = req.body.email;
  console.log(emailFind);
  
	db.users.findOne({email:req.body.email}, function(err, docs){
		res.json(docs);
	});	
});

/************************************** BLOCKING *************************************/

app.get('/get_blocked_users', function(req, res) {

  db.blocked_users.find({user_id:req.signedCookies.user_id}, function(req, docs){
    console.log(docs);
    res.json(docs);
  });
});

app.post('/add_blocked_user', function(req, res) {
  console.log("XX");
  var blocked_id = req.body.blocked_user_id;
  var blocked_email = req.body.blocked_user_email;
  db.blocked_users.createIndex({user_id: 1, blocked_user_id: 1}, {unique:true});
  db.blocked_users.insert({user_id: req.signedCookies.user_id, blocked_user_id:blocked_id, 
                           blocked_user_email:blocked_email}, function(req, docs){
    console.log(docs);
    res.json(docs);
  });
});

app.delete('/remove_block/:id', function(req, res){

	var id = req.params.id;
	db.blocked_users.remove({_id: mongojs.ObjectId(id)}, function(err, doc){
		res.json(doc);
	});
});
/*************************************************************************************/
/************************************** BUDDIES **************************************/

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

  var sent_from_id = req.signedCookies.user_id;
  var sent_from_name = req.signedCookies.name;
  if(!sent_from_id){
    return;
  }
  var sent_to_id = req.body.sent_to_id;
  var sent_to_name = req.body.sent_to_name;
	db.user_buddy_requests.insert({sent_from_id:sent_from_id, sent_from_name:sent_from_name,
                                 sent_to_id:sent_to_id, sent_to_name:sent_to_name}, function(err, docs){
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

/*************************************************************************************/
/******************************* TO BE REMOVED (MAYBE) *******************************/

// forces the name property to be unique in user_classes collection
//db.user_classes.createIndex({name: 1}, {unique:true});
app.post('/user_classes', function(req, res) {
  console.log(req.body);
  var get_user_id = req.signedCookies.user_id;
  db.user_classes.createIndex({name: 1, user_id: 1}, {unique:true}); //BUG: NEEDS FIX
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
	db.user_classes.find({user_id: get_user_id}, function(err, docs) {
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

/*************************************************************************************/
/******************************** GET CLASSES & ROOMS ********************************/

// return the class_ids of classes this user is enrolled in
app.get('/get_my_classes/', function(req, res) {
	var user_id = req.signedCookies.user_id;
  if (user_id) {
    db.users.findOne({user_id: user_id}, function (err, doc) {
      if (doc) {
        res.send({class_ids: doc.class_ids});
      }
      else {
        res.send({class_ids: []});
      }
    });
  }
  else {
    res.send({class_ids: []});
  }
});

// return the class objects for all classes
app.get('/get_all_classes', function (req, res) {
  db.classes.find({}, function (err, doc) {
    res.send(doc);
  });
});

// return the class object with this id
app.get('/get_class/:class_id', function(req, res) {
	var class_id = req.params.class_id;

	// look up name in mongoDB
	db.classes.findOne({class_id: class_id}, function (err, doc) {
    res.send(doc);
	});
});

/*************************************************************************************/
/*************************************** ROOMS ***************************************/

app.get('/add_room/:class_id/:room_name/:is_lecture/:time_created', function(req, res) {
  var host_id = req.signedCookies.user_id;
  if (!host_id) {
    res.send({error: "invalid_user_id"});
    return;
  }

  var class_id = req.params.class_id;
  var room_name = req.params.room_name;
  var is_lecture = req.params.is_lecture == "true";
  var time_created = parseInt(req.params.time_created);

  // error checking
  db.classes.findOne({class_id: class_id}, function (err, doc) {
    
    // if class with class_id exists
    if (doc) {

      // if host is a non-tutor attempting to host a lecture
      if (is_lecture && (!doc.tutor_ids || doc.tutor_ids.indexOf(host_id) == -1)) {
        res.send({error: "not_a_tutor"});
        return;
      }

      // add the room
      addRoom(class_id, room_name, 
        host_id, is_lecture, time_created, function(room_id){res.send(room_id);});
    }

    // class with class_id does not exist
    else {
      res.send({error: "invalid_class_id"});
      return;
    }
  });
});

// - adds user_id to room with id room_id
// - returns list of user_id's in that room
app.get('/join_room/:room_id/', function(req, res) {
	var user_id = req.signedCookies.user_id;
  if (user_id) {
	  var room_id = req.params.room_id;
    joinRoom(user_id, room_id, function(roomInfo){res.send(roomInfo);});
  }
  else {
    res.send({error: "invalid_user_id"});
  }
});

// - removes user_id from room with id room_id
app.get('/leave_room/:room_id/', function(req, res) {
	var user_id = req.signedCookies.user_id;
  if (user_id) {
	  var room_id = req.params.room_id;
    leaveRoom(user_id, room_id, function(success){res.send(success);});
  }
  else {
    res.send({error: "invalid_user_id"});
  }
});

/* POST data: {chatMessage} - post chat message to firebase in respective room
 * Returns: nothing */
app.post("/send_room_message", function(req, res) {
  var roomID = req.body.roomID;
  var timeSent = req.body.timeSent;
  var text = req.body.text;
  
  //roomMessagesDatabase.child(roomID).push().set(req.body);
  if (req.signedCookies.user_id && req.signedCookies.email && req.signedCookies.name) {
    var newChatMessage = new ChatMessage(req.signedCookies.name, 
      req.signedCookies.email, text, roomID, timeSent);
    roomMessagesDatabase.child(roomID).push().set(newChatMessage);
  }

  res.send({}); //close the http request
});

/*************************************************************************************/
/********************************* SIGNUP AND LOGIN **********************************/

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

// - returns user with given email / password
app.post('/accountlogin', function(req, res) {

  var email = req.body.email;
  var password = req.body.password;
  console.log("get user with email " + email + " and pass " + password);
  db.users.findOne({email: email, password: password}, function (err, doc) {
    if (doc) {
      res.cookie("user_id", doc.user_id, {signed: true, maxAge: COOKIE_TIME});
      res.cookie("email", doc.email, {signed: true, maxAge: COOKIE_TIME});
      res.cookie("name", doc.name, {signed: true, maxAge: COOKIE_TIME});
    }
    res.json(doc);
  });
});


/*************************************************************************************/
/******************************** ACCOUNT MANAGEMENT *********************************/

// sets the class_ids for this user to the class_ids array passed in
app.post('/enroll', function (req, res) {
  var user_id = req.signedCookies.user_id;
  var class_ids = req.body.class_ids;
  console.log("enrolling user with id " + user_id + " in " + class_ids);
  db.users.update({user_id: user_id},
    {$set: {class_ids: class_ids}}, function (err, doc) {
      res.send({success: doc != null});
    });
})

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
/*************************************************************************************/

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

function Room(room_id, room_name, room_host_id, class_id, is_lecture, time_created) {
	this.room_id = room_id;
	this.name = room_name;
	this.host_id = room_host_id;
	this.class_id = class_id;
	this.is_lecture = is_lecture;
  this.time_created = time_created;
}

function ChatMessage(name, email, text, roomID, timeSent) {
  this.name = name;
  this.email = email;
  this.text = text;
  this.roomID = roomID;
  this.timeSent = timeSent;
}

//TODO: ERIC - fix callback stuff so res gets sent back + make this cleaner
function addRoom(class_id, room_name, room_host_id, is_lecture, time_created, callback) {
  var room_id = class_id + "_" + generateToken();
  //console.log("FIREBASE: Attempting to add room with id " + room_id);
  var newRoom = new Room(room_id, room_name, room_host_id, class_id, is_lecture, time_created);
  //push new room id into class list of rooms
  var classRoomRef = classRoomsDatabase.child(class_id).push();
  classRoomRef.set(room_id);
  console.log("FIREBASE: addRoom - Added roomid " + room_id + " to class " + class_id);
  //push new room info into room info database under room id
  roomInfoDatabase.child(room_id).set(newRoom, function(err) {
    if (!err) {
      console.log("FIREBASE: addRoom - Room " + room_id  + " inserted into RoomInfo database");
      roomInfoDatabase.child(room_id).update({firebase_push_id: classRoomRef.key}) 
      if (callback) {
        callback({room_id: room_id});
      }
    }
    else {
      console.log("FIREBASE: ERROR - failed to add room " + room_id + " to RoomInfo database");
      if (callback) {
        callback({error: "failed_to_add_room"});
      }
    }
  });
}

function joinRoom(user_id, room_id, callback) {
	//console.log("FIREBASE: Attempting to add user " + user_id + " to room " + room_id);
  roomInfoDatabase.child(room_id).once("value").then(function(snapshot) {
    var room = snapshot.val();
    if (room) {
      roomInfoDatabase.child(room_id).child("users").push().set(user_id, function(err) {
        if (!err) {
          console.log("FIREBASE: joinRoom - Added user " + user_id + " to room" + room_id);
          if (callback) { //have to grab all of room info for callback TODO: change this?
            roomInfoDatabase.child(room_id).once("value").then(function(snapshot) {
              var updatedRoom = snapshot.val();
              if (callback) {
                callback(updatedRoom);
              }
            });
          }
        }
        else {
          if (callback) {
            console.log("FIREBASE: ERROR - User wasn't added for some reason");
            callback(null);
          }
        }
      });
    }
    else {
      console.log("FIREBASE: ERROR - Room doesn't exist anymore, user failed to join");
      if (callback) {
        callback(null);
      }
    }
  });
}

function leaveRoom(user_id, room_id, callback) {
	//console.log("FIREBASE: Attempting to remove user " + user_id + " from room " + room_id);
  if (callback) {
    callback({success: true}); //assume user succesfully leaves the room
  }
  console.log("FIREBASE: leaveRoom - Removed user " + user_id + " from room" + room_id);
  //query room's users list
  roomInfoDatabase.child(room_id).child("users").once("value").then(function(snapshot) {
    var room = snapshot.val();
    if (snapshot.val()) {
      var users = [];
      snapshot.forEach(function(childSnapshot) {
        users.push(childSnapshot.val());
      });
      snapshot.forEach(function(childSnapshot) {
        var key = childSnapshot.key;
        var value = childSnapshot.val();
        if (value == user_id) {
          //rm the user
          childSnapshot.ref.remove(function(err) {
            if (users.length == 1) {
              //if last user left, check for delete conditions
              setTimeout(bufferTimer, MAX_IDLE, room_id);
              snapshot.ref.parent.child("last_active_time").set(Date.now());
            }
          });
        }
      });
    }
    else {
      console.log("FIREBASE: ERROR - room no longer exists");
    }
  });
}

function bufferTimer(room_id) {
  roomInfoDatabase.child(room_id).once("value").then(function(snapshot) {
    var room = snapshot.val();
    if (room) {
      var timeDiff = Date.now() - room.time_created;
      if (timeDiff > BUFFER_TIME) {
        checkToDelete(room_id);
      }
      else {
        setTimeout(checkToDelete, BUFFER_TIME - timeDiff, room_id);
      }
    }
  });
}

function checkToDelete(room_id) {
  console.log("FIREBASE: checkToDelete - Checking delete conditions for " + room_id);
  //query room data to check delete conditions
  roomInfoDatabase.child(room_id).once("value").then(function(snapshot) {
    var room = snapshot.val();
    if (room) {
      if (!room.users) { //no users left
        console.log("FIREBASE: checkToDelete - No more users left in room " + room_id);
        console.log("FIREBASE: checkToDelete - Last active: " + room.last_active_time);
        var now = Date.now();
        if (now - room.last_active_time > MAX_IDLE) {
          console.log("FIREBASE: checkToDelete - Would be deleting");
          if (room.host_id != MAIN_HOST) { //not a main room
            console.log("FIREBASE: checkToDelete - Attempting to delete room");
            var class_id = room.class_id;
            var firebase_push_id = room.firebase_push_id;
            deleteRoom(room_id, class_id, firebase_push_id);
            console.log("FIREBASE: checkToDelete - Succesfully deleted room " + room_id);
          }
        }
      }
    }
    else {
      console.log("FIREBASE: ERROR - Couldn't find room to delete");
    }
  });
}

function deleteRoom(room_id, class_id, firebase_push_id) {
  roomInfoDatabase.child(room_id).remove();
  classRoomsDatabase.child(class_id).child(firebase_push_id).remove();
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


app.listen(process.env.PORT || 3000);
console.log("Server running!");
