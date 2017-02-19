var fs = require("fs");
var mongojs = require('mongojs');
var db = mongojs('mongodb://studyspace:raindropdroptop@ds033086.mlab.com:33086/studyspace', []);

var firebaseAdmin = require("firebase-admin");
var serviceAccount = require("./dontlookhere/porn/topsecret.json"); //shhhh
var firebase = firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount),
  databaseURL: "https://studyspace-490cd.firebaseio.com/"
});
var firebaseRoot = firebase.database().ref();
var classRoomsDatabase = firebaseRoot.child("ClassRooms");
var roomInfoDatabase = firebaseRoot.child("RoomInfo");

var classlist = [];
var x = 0;


fs.readFile("classlist", "utf8", function(err, data) {

  if (err) {
    return console.log(err);
  }

  var arr = data.split("\n");

  classlist = arr;

  console.log("STARTING!");

  //the magic
  for (var i = 0; i < classlist.length-1; i++) {
    //uploadToMongo(classlist[i]);
    //removeFromMongo(classlist[i]);
    makeMainRoom(classlist[i]);
    //removeRoom(classlist[i]);
  }
});


function uploadToMongo(className) {
  var newClass = new Class(generateClassID(className), className);
  console.log("Pushing " + newClass.name);
  db.classes.insert(newClass, function(err, doc) {
    if (doc) {
      console.log("Successfully pushed " + doc.name);
    }
  });
}

function removeFromMongo(className) {
  db.classes.remove({name: className}, function(err, doc) {
    if (doc) {
      console.log("Successfully removed " + className);
    }
  });
}

function makeMainRoom(className) {
  var roomID = className.replace(/ /g, "_") + "_MAIN";
  var classID = generateClassID(className);
  var newRoom = new Room(roomID, "main", "mainhost", classID, false, Date.now());
  roomInfoDatabase.child(roomID).set(newRoom, function() {console.log("Made room");});
  var pushRef = classRoomsDatabase.child(classID).push();
  pushRef.set(roomID);
  roomInfoDatabase.child(roomID).child("firebase_push_id").set(pushRef.key);
}

function removeRoom(className) {
  var roomID = className.replace(/ /g, "_") + "_MAIN";
  var classID = generateClassID(className);
  roomInfoDatabase.child(roomID).remove();
  classRoomsDatabase.child(classID).remove();
}

function generateClassID(className) {
  className = "UCSD " + className;
  return className.replace(/ /g, "_");
}

function Class(class_id, class_name) {
	this.class_id = class_id;	// "ucsd_cse_110_1"
	this.name = class_name; // "CSE 110 Gillespie"
  this.description = this.name + " at UCSD";
}

function Room(room_id, room_name, room_host_id, class_id, is_lecture, time_created) {
	this.room_id = room_id;
	this.name = room_name;
	this.host_id = room_host_id;
	this.class_id = class_id;
	this.is_lecture = is_lecture;
  this.time_created = time_created;
}
