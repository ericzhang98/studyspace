// server.js will be our website's server that handles communication
// between the front-end and the database
var deployment = false; //currently just whether or not to use HTTPS
if (process.argv[2] == "heroku") {
  deployment = true;
}

/* SETUP ---------------------------------------------------------------*/

// - Express is a Node framework that makes everything easier
// - require returns a 'module', which is essentially an object
// packed with functions
var express = require('express');
var app = express();

/*********************************** SOCKET SETUP ************************************/
var server = require('http').Server(app);
var io = require('socket.io')(server);

io.on('connection', function (socket) {});

server.listen(3000);
/*************************************************************************************/

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
// DELETE THIS SHIT ASAP (ONCE THERE'S NO MORE DATABASE CODE IN SERVER.JS)
var firebaseAdmin = require("firebase-admin");
var serviceAccount = require("./dontlookhere/porn/topsecret.json"); //shhhh
var firebase = firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount),
  databaseURL: "https://studyspace-490cd.firebaseio.com/"
}, "god fucking damnit");
var firebaseRoot = firebase.database().ref();
var classRoomsDatabase = firebaseRoot.child("ClassRooms");
var roomInfoDatabase = firebaseRoot.child("RoomInfo");
var roomMessagesDatabase = firebaseRoot.child("RoomMessages");
var roomPinnedMessagesDatabase = firebaseRoot.child("RoomPinnedMessages");
var userActivityDatabase = firebaseRoot.child("UserActivity");
var classDLDatabase = firebaseRoot.child("ClassDownLists");

var favicon = require("serve-favicon");
app.use(favicon(__dirname + "/public/assets/images/favicon.ico"));

var youtubeSearch = require("youtube-search");
var opts = {
  maxResults: 1,
  key: "AIzaSyCFalKOCAsmO9yLwf424Jg2eEXz9U5ESLE"
}

var request = require("request");


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


//Globals
var VIEW_DIR = __dirname + "/public/";
var COOKIE_TIME = 7*24*60*60*1000; //one week
var USER_IDLE = 30*1000;



// Studyspace module constructors
const ConstantManager = require("./constants.js");
const RoomManager = require("./room.js");
const AccountManager = require("./account.js");
const ActionManager = require("./action.js");
const ClassManager = require("./class.js");
const ErrorManager = require("./error.js");
const ClassDLManager = require("./classDL.js");

// Studyspace module instances
var constantManager = new ConstantManager();
var roomManager = new RoomManager(constantManager);
var accountManager = new AccountManager(constantManager);
var actionManager = new ActionManager(constantManager);
var classManager = new ClassManager(constantManager);
var errorManager = new ErrorManager(constantManager);
var classDLManager = new ClassDLManager(constantManager, io, roomManager.addRoom);
classDLManager.monitorClassDL("CSE_110");

/* HTTP requests ---------------------------------------------------------*/

/************************************ SERVING CONTENT *************************************/

app.get('/', function(req, res) {
  //check login and decide whether to send login or home
  var user_id = req.signedCookies.user_id;
  if (user_id) {
    db.users.findOne({user_id: user_id}, function(err, doc){
      if (doc) {
        userActivityDatabase.child(user_id).child("online").set(true); //set online status
        console.log("USER ONLINE: " + user_id);
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

app.get('/audio/:song_code', function (req, res) {
  var song_code = req.params.song_code;
  res.sendFile('/audio/' + song_code);
});

/*************************************************************************************/















/* Studyspace API -------------------------------------------------------------------*/


/********************************* SIGNUP AND LOGIN **********************************/

/* POST data: {email, password} - login attempt
 * Updates user's cookies with signed user_id, email, and name
 * Returns: {user} - user info, null if attempt failed*/
app.post('/accountlogin', function(req, res) {
  var email = req.body.email;
  var password = req.body.password;
  accountManager.login(email, password, function(err, data) {
    if (!err) {
      res.cookie("user_id", data.user_id, {signed: true, maxAge: COOKIE_TIME});
      res.cookie("email", data.email, {signed: true, maxAge: COOKIE_TIME});
      res.cookie("name", data.name, {signed: true, maxAge: COOKIE_TIME});
      res.send({user: data});
    }
    else {
      res.send({error: err});
    }
  });
});

/* POST data: {email, password} - account signup attempt
 * Returns: {success} - whether or not it succeeded */
app.post("/accountsignup", function(req, res) {
  var name = req.body.name;
  var school = req.body.school;
  var email = req.body.email;
  var password = req.body.password;
  accountManager.signup(name, school, email, password, function(err, data) {
    if (!err) {
      res.cookie("user_id", data.user_id, {signed: true, maxAge: COOKIE_TIME});
      res.cookie("email", data.email, {signed: true, maxAge: COOKIE_TIME});
      res.cookie("name", data.name, {signed: true, maxAge: COOKIE_TIME});
      res.send({success: true});
    }
    else {
      res.send({success: false});
    }
  });
});

/* GET data: {ID of account to verify, token} - verify account with token
 * Returns: {success} - whether or not the account was verified */
app.get("/accountverify/:id/:token", function(req, res) {
  var id = req.params.id;
  var token = req.params.token;
  accountManager.verify(id, token, function(err, data) {  
    if (!err) {
      res.send({success: true});
    }
    else {
      res.send({success: false});
    }
  });
});

/*************************************************************************************/

/******************************** ACCOUNT MANAGEMENT *********************************/

/* POST data: {email of account to reset password} - send password reset link to email
 * Returns: {success} - whether or not password reset link was sent */
app.post("/sendforgotpassword", function(req, res) {
  var email = req.body.email;
  accountManager.sendForgotPassword(email, function(err, data) {
    res.send(data);
  });
});

//TODO: SHOULD RENAME TO CHANGE PASSWORD
/* POST data: {currPass, newPass} - password change attempt
 * Returns: {success} - whether or not password reset was succesful */
app.post("/resetpassword", function(req, res) {
  var user_id = req.signedCookies.user_id;
  var currPassword = req.body.currPass;
  var newPassword = req.body.newPass;
  accountManager.resetPassword(user_id, currPassword, newPassword, function(err, data) {
    res.send(data);
  });
});

// sets the class_ids for this user to the class_ids array passed in
app.post('/enroll', function (req, res) {
  var user_id = req.signedCookies.user_id;
  var class_ids = req.body.class_ids;
  accountManager.enroll(user_id, class_ids, function(err, data) {
    res.send(data);
  });
})

// return the class_ids of classes this user is enrolled in
app.get('/get_my_classes/', function(req, res) {
  var user_id = req.signedCookies.user_id;
  if (!user_id) {
    res.send({error: "invalid_user_id"});
    return;
  }
  accountManager.getMyClasses(user_id, function(err, data) {
    res.send(data);
  });
});

/*************************************************************************************/


/*************************************** ROOMS ***************************************/

app.get('/add_room/:class_id/:room_name/:is_lecture/:time_created/:host_name', function(req, res) {
  var host_id = req.signedCookies.user_id;
  if (!host_id) {
    res.send({error: "invalid_user_id"});
    return;
  }
  var class_id = req.params.class_id;
  var room_name = req.params.room_name;
  var is_lecture = req.params.is_lecture == "true";
  var time_created = parseInt(req.params.time_created);
  var host_name = req.params.host_name;
  roomManager.addRoom(class_id, room_name, host_id, is_lecture, time_created, host_name, 
    function(err, data) {
      res.send(data);
  });
});

// - adds user_id to room with id room_id
// - returns list of user_id's in that room
app.get('/join_room/:room_id/', function(req, res) {
  var user_id = req.signedCookies.user_id;
  if (!user_id) {
    res.send({error: "invalid_user_id"});
    return;
  }
  var room_id = req.params.room_id;
  roomManager.joinRoom(user_id, room_id, function(err, data){
    if (!err) {
      res.send(data);
    }
    else {
      res.send(err);
    }
  });
});

// - removes user_id from room with id room_id
app.get('/leave_room/:room_id/', function(req, res) {
  var user_id = req.signedCookies.user_id;
  if (!user_id) {
    res.send({error: "invalid_user_id"});
    return;
  }
  var room_id = req.params.room_id;
  roomManager.leaveRoom(user_id, room_id, function(err, data) {
    res.send({success: true})
  });
});

/*************************************************************************************/

/************************************ ROOM ACTIONS ***********************************/

app.post("/pin_message/", function(req, res) {
  var room_id = req.body.room_id;
  var chat_message_key = req.body.chat_message_key;
  var user_id = req.body.user_id;
  var name = req.body.name;
  var time_sent = req.body.time_sent;
  var concat_text = req.body.concat_text;
  actionManager.pinMessage(room_id, chat_message_key, user_id, name, time_sent, concat_text, function() {
    res.end();
  });
})

/* POST data: {chatMessage} - post chat message to firebase in respective room
 * Returns: nothing */
app.post("/send_room_message", function(req, res) {
  var user_id = req.signedCookies.user_id;
  var email = req.signedCookies.email;
  var name = req.signedCookies.name;
  var roomID = req.body.roomID;
  var timeSent = req.body.timeSent;
  var text = req.body.text;
  var other_user_id = req.body.other_user_id;
  if (user_id && email && name) {
    actionManager.sendRoomMessage(roomID, timeSent, text, other_user_id, 
      user_id, email, name, function() {
        res.end();
      });
  }
});

app.get("/clear_message_notifications/:other_user_id", function(req, res) {
  var user_id = req.signedCookies.user_id;
  var other_user_id = req.params.other_user_id;
  console.log(user_id);
  console.log(req.params);
  actionManager.clearMessageNotifications(user_id, other_user_id, function() {
    res.end();
  });
});

/*************************************************************************************/

/******************************** GET CLASSES & ROOMS ********************************/

// return the class objects for all classes
app.get('/get_all_classes', function(req, res) {
  classManager.getAllClasses(res);
});

// return the class object with this id
app.get('/get_class/:class_id', function(req, res) {
  var class_id = req.params.class_id;
  classManager.getClassInfo(class_id, res);
});

/*************************************************************************************/

/********************************** CLASS DOWN LIST **********************************/

// toggle a user's true / false value within a down list
// sets to true by default
app.get('/toggle_down_list/:class_id', function(req, res) {
  var user_id = req.signedCookies.user_id;
  var class_id = req.params.class_id;
  classDLManager.toggleUserDL(user_id, class_id, function(isDown) {
    res.send({isDown: isDown});
  });
});

/*************************************************************************************/



//TODO: Surgery
/************************************** BUDDIES **************************************/
app.post('/buddy_existing_user', function(req, res) {

  //check if the user is themself
  if(req.body == req.signedCookies.user_id){
    return null;
  }
  //grab other user's data, null if they don't exist
  db.users.findOne({user_id: req.body.other_user_id}, function(err, docs){
    //console.log(docs);
    res.json(docs);
  });	

});

app.post('/buddy_existing_request', function(req, res) {

  //console.log(req.body.friend_id);
  var user_id = req.signedCookies.user_id;
  var friend_id = req.body.friend_id;
  db.user_buddy_requests.find(
    {$or:[{sent_from_id:user_id, sent_to_id:friend_id},
          {sent_from_id:friend_id, sent_to_id:user_id}]},
    function(err, docs){
      //console.log(docs);
      res.json(docs);
    });	

});

app.post('/buddies_already', function(req, res) {

  //console.log("Friendship check");
  var user_id = req.signedCookies.user_id;
  var friend_id = req.body.friend_id;
  var friend_name = req.body.friend_name;

  db.user_buddies.find({user_one_id:user_id}, function(err, docs){

    if(!docs[0]) {
      res.json(null);
      return;
    }

    var buddies = docs[0]['buddies'];

    for (var i = 0; i < buddies.length; i++){
      var obj = buddies[i];
      if(obj['user_two_id'] == friend_id){
        res.json("Friends");
        return;
      }
    }

    res.json(null);
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
  db.user_buddy_requests.insert(
    {sent_from_id:sent_from_id, sent_from_name:sent_from_name,
    sent_to_id:sent_to_id, sent_to_name:sent_to_name}, 
      function(err, docs){
        res.json(docs);
  });
  
});

app.post('/get_my_buddy_requests', function(req, res) {
  db.user_buddy_requests.find({sent_to_id: req.signedCookies.user_id}, function(err, docs){
    //console.log(docs);
    res.json(docs);
  });	

});

app.post('/accept_buddy', function(req, res) {
  var user_one_id = req.signedCookies.user_id;
  var user_one_name = req.body.user_one_name;
  var user_two_id = req.body.user_two_id;
  var user_two_name = req.body.user_two_name;
  db.user_buddies.update({user_one_id:user_one_id}, 
    {$push: {buddies:{user_two_id:user_two_id, user_two_name:user_two_name}}},
    {upsert: true}, function(err,docs){
      
  });

  // b/c this is the user that actually accepted the request
  db.user_buddies.update({user_one_id:user_two_id},
    {$push: {buddies:{user_two_id:user_one_id, user_two_name:user_one_name}}},
    {upsert: true}, function(err,docs){
    res.json(docs);
  });

  //setup msg notifcations
  firebaseRoot.child("Notifications").child(user_one_id).child("MessageNotifications")
    .child(user_two_id).set(0);
  firebaseRoot.child("Notifications").child(user_two_id).child("MessageNotifications")
    .child(user_one_id).set(0);
});

app.post('/get_my_buddies', function(req, res){

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
  var user_one_id = req.signedCookies.user_id;
  db.user_buddies.update({user_one_id:user_one_id}, {$pull:{'buddies':{user_two_id:id}}});
  db.user_buddies.update({user_one_id:id}, {$pull:{'buddies':{user_two_id:user_one_id}}}, function(err, doc){
    res.json(doc);
  });
});

/*************************************************************************************/




















/***********************************HELPER STUFF****************************************/
// get a user from a user_id (responds with just name and user_id)
app.get('/get_user/:user_id/', function(req, res) {
  var user = req.params.user_id;
  db.users.findOne({user_id: user}, function(err, doc) {
    if (doc) {
      res.json({name: doc.name, user_id: doc.user_id}); 
    }
    else {
      res.json({error: "Could not get user"});
    }
  });
});

//get a user from an email (responds with just user_id)
app.get("/user_id_from_email/:email/", function(req, res) {
  var email = req.params.email;
  db.users.findOne({email: email}, function(err, doc) {
    if (doc) {
      console.log("email is valid");
      res.send({user_id: doc.user_id});
    }
    else {
      console.log("email is not valid");
      res.send({error: "Could not find user"});
    }
  });
});

app.get("/ping", function(req, res) {
  res.end();
  var user_id = req.signedCookies.user_id;
  if (user_id) {
    //console.log("PING: " + user_id);
    userActivityDatabase.child(user_id).child("lastActive").set(Date.now()); 
    userActivityDatabase.child(user_id).child("online").set(true);
    if (req.signedCookies.name) {
      firebaseRoot.child("zLookup").child(user_id).set(req.signedCookies.name);
    }
  }
});

app.get("/offline", function(req, res) {
  res.end();
  var user_id = req.signedCookies.user_id;
  if (user_id) {
    console.log("USER OFFLINE: " + user_id);
    userActivityDatabase.child(user_id).child("online").set(false);
  }
});

app.get("/typing/:is_typing/:room_id", function(req, res) {
  res.end();
  if (req.signedCookies.user_id) {
    var typing = req.params.is_typing == "true";
    var room_id = req.params.room_id;
    if (typing) {
      firebaseRoot.child("RoomTyping").child(room_id).child(req.signedCookies.user_id).set(true);
    }
    else {
      firebaseRoot.child("RoomTyping").child(room_id).child(req.signedCookies.user_id).remove();
    }
  }
});

app.post("/broadcast_song/", function(req, res) {
  res.end();
  if (req.signedCookies.user_id) {
    console.log(req.body);
    var room_id = req.body.room_id;
    var url = req.body.url;
    if (url == null) {
      firebaseRoot.child("RoomSong").child(room_id).set(null);
    }
    else {
      firebaseRoot.child("RoomSong").child(room_id).child("url").set(url);
    }

    //get video info
    if (url) {
      var youtubeDirtyId = url.split("/watch?v=")[1];
      //clean up the dirty id
      var youtubeCleanId = null;
      if (youtubeDirtyId) {
        youtubeCleanId = youtubeDirtyId.split("?")[0];
        youtubeCleanId = youtubeCleanId.split("&")[0];

        var snippetPath = "https://www.googleapis.com/youtube/v3/videos?" + "key=" + opts.key 
          + "&part=snippet" + "&id=" + youtubeCleanId;
        request.get(snippetPath, function(err, res, body){
          var info = JSON.parse(body);
          if (info.items[0]) {
            var title = info.items[0].snippet.title;
            console.log(title);
            firebaseRoot.child("RoomSong").child(room_id).child("title").set(title);
          }
        });
        var contentDetailsPath = "https://www.googleapis.com/youtube/v3/videos?" + "key=" + opts.key 
          + "&part=contentDetails" + "&id=" + youtubeCleanId;
        request.get(contentDetailsPath, function(err, res, body) {
          var info = JSON.parse(body);
          if (info.items[0]) {
            var duration = info.items[0].contentDetails.duration;
            /*
            var duration_iso8061 = results[0].contentDetails.duration;
            //parse time into ms
            var secondsRegex = /(\d+)S/;
            var minutesRegex = /(\d+)M/;
            var hoursRegex = /(\d+)H/;
            var seconds = secondsRegex.exec(duration_iso8061);
            var minutes = minutesRegex.exec(duration_iso8061);
            */
            console.log(duration);
            firebaseRoot.child("RoomSong").child(room_id).child("duration").set(duration);
          }
        });

      }
    }
  }
});

app.get("/youtube_search/:query", function(req, res) {
  if (req.signedCookies.user_id) {
    var query = req.params.query;
    youtubeSearch(query, opts, function(err, results) {
      if (err) {return console.log(err)}
      if (results) {
        var youtube_video_id = results[0].id;
        res.send({youtube_video_id: youtube_video_id});
      }
      else {
        res.end();
      }
    });
  }
});


/* User activity methods --------------------------------------------------------*/

// continuous checker for all users to process activity
function userActivityChecker() {
  userActivityDatabase.once("value").then(function(snapshot) {
    //console.log("USER ACTIVITY CHECKER: checking activity of all users");
    snapshot.forEach(function(childSnapshot) {
      var user_id = childSnapshot.key;
      var activityLog = childSnapshot.val();
      processActivity(user_id, activityLog);
    });
  });
  console.log("checking user activity");
  setTimeout(userActivityChecker, USER_IDLE);
}

// updates a user's activity log of lastRooms and online
function processActivity(user_id, activityLog) {
  if (activityLog) {
    //if the user is in a room and hasn't pinged within the last minute, rm them from room
    if (activityLog.lastRooms && Date.now() - activityLog.lastActive > USER_IDLE) {
      //console.log("USER ACTIVITY CHECKER: removing user " + user_id);
      var lastRooms = Object.keys(activityLog.lastRooms).map((k) => activityLog.lastRooms[k]);
      for (var i = 0;  i < lastRooms.length; i++) {
        roomManager.leaveRoom(user_id, lastRooms[i]);
      }
      userActivityDatabase.child(user_id).child("lastRooms").set(null);
    }
    if (activityLog.online && Date.now() - activityLog.lastActive > USER_IDLE) {
      //console.log("USER ACTIVITY CHECKER: user offline - " + user_id);
      userActivityDatabase.child(user_id).child("online").set(false);
    }
  }
}

/*
//rm user from last room when they sign on
function checkSingleUserActivity(user_id) {
  userActivityDatabase.child(user_id).once("value").then(function(snapshot) {
    var activityLog = snapshot.val();
    if (activityLog && activityLog.lastRoom) {
      leaveRoom(user_id, activityLog.lastRoom);
      userActivityDatabase.child(user_id).child("lastRoom").set(null);
    }
  });
}
*/


/*------------------------------------------------------------------------*/


//app.listen(process.env.PORT || 3000);
userActivityChecker();
console.log("Server running!");
