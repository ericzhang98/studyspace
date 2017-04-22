var singletonRoomManager = function() {

  var mongojs = require('mongojs');
  var db = mongojs('mongodb://studyspace:raindropdroptop@ds033086.mlab.com:33086/studyspace', []);

  // - Firebase admin setup
  var firebaseAdmin = require("firebase-admin");
  var serviceAccount = require("./dontlookhere/porn/topsecret.json"); //shhhh
  var firebase = firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert(serviceAccount),
      databaseURL: "https://studyspace-490cd.firebaseio.com/"
  }, "lol");
  var firebaseRoot = firebase.database().ref();
  var classRoomsDatabase = firebaseRoot.child("ClassRooms");
  var roomInfoDatabase = firebaseRoot.child("RoomInfo");
  var roomMessagesDatabase = firebaseRoot.child("RoomMessages");
  var roomPinnedMessagesDatabase = firebaseRoot.child("RoomPinnedMessages");
  var userActivityDatabase = firebaseRoot.child("UserActivity");


  var MAIN_HOST = "mainhost";
  var MAX_IDLE = 10*1000;
  var BUFFER_TIME = 20*1000;


  function Room(room_id, room_name, room_host_id, class_id, is_lecture, time_created, host_name) {
    this.room_id = room_id;
    this.name = room_name;
    this.host_id = room_host_id;
    this.class_id = class_id;
    this.is_lecture = is_lecture;
    this.time_created = time_created;
    this.host_name = host_name;
  }

  //TODO: ERIC - fix callback stuff so res gets sent back + make this cleaner
  function createRoom(class_id, room_name, room_host_id, is_lecture, time_created, host_name, callback) {
    var room_id = class_id + "_" + generateToken();
    var newRoom = new Room(room_id, room_name, room_host_id, class_id, is_lecture, time_created, host_name);

    //push new room id into class list of rooms
    var classRoomRef = classRoomsDatabase.child(class_id).push();
    classRoomRef.set(room_id);

    //push new room info into room info database under room id
    roomInfoDatabase.child(room_id).set(newRoom, function(err) {
      if (!err) {
        console.log("FIREBASE: addRoom - Room " + room_id  + " inserted into RoomInfo database");
        roomInfoDatabase.child(room_id).update({firebase_push_id: classRoomRef.key}) 
        if (callback) {
          callback(null, newRoom);
        }
      }
      else {
        console.log("FIREBASE: ERROR - failed to add room " + room_id + " to RoomInfo database");
        if (callback) {
          callback({error: "failed_to_add_room"}, null);
        }
      }
    });
  };

  this.addRoom = function(class_id, room_name, host_id, is_lecture, time_created, host_name, callback) {
    // error checking
    db.classes.findOne({class_id: class_id}, function (err, doc) {
      // if class with class_id exists
      if (doc) {
        // if host is a non-tutor attempting to host a lecture
        if (is_lecture && (!doc.tutor_ids || doc.tutor_ids.indexOf(host_id) == -1)) {
          if (callback) {
            callback({error: "not_a_tutor"}, null);
          }
          return;
        }
        createRoom(class_id, room_name, host_id, is_lecture, time_created, host_name, 
          function(room_id){
            if (callback) {
              callback(null, room_id);
            }
          });
      }

      // class with class_id does not exist
      else {
        //res.send({error: "invalid_class_id"});
        if (callback) {
          callback({error: "invalid_class_id"}, null);
        }
      }
    });
  };

  this.joinRoom = function(user_id, room_id, callback) {
    roomInfoDatabase.child(room_id).once("value").then(function(snapshot) {
      var room = snapshot.val();
      if (room) {
        roomInfoDatabase.child(room_id).child("users").push().set(user_id, function(err) {
          if (!err) {
            console.log("FIREBASE: joinRoom - Added user " + user_id + " to room " + room_id);
            if (callback) { //have to grab all of room info for callback TODO: change this?
              roomInfoDatabase.child(room_id).once("value").then(function(snapshot) {
                var updatedRoom = snapshot.val();
                if (callback) {
                  callback(null, updatedRoom);
                }
              });
            }
            userActivityDatabase.child(user_id).child("lastRooms").push().set(room_id);
            userActivityDatabase.child(user_id).child("lastActive").set(Date.now());
          }
          else {
            if (callback) {
              console.log("FIREBASE: ERROR - User wasn't added for some reason");
              callback("error", null);
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
  };

  this.leaveRoom = function(user_id, room_id, callback) {
    if (callback) {
      callback({success: true}); //assume user succesfully leaves the room
    }
    console.log("FIREBASE: leaveRoom - Removed user " + user_id + " from room " + room_id);
    //grab the room's users list and rm the user from it
    roomInfoDatabase.child(room_id).child("users").once("value").then(function(snapshot) {
      if (snapshot.val()) {
        var users = [];
        var removed = false; //temp jank xD
        snapshot.forEach(function(childSnapshot) {
          users.push(childSnapshot.val());
        });
        snapshot.forEach(function(childSnapshot) {
          var key = childSnapshot.key;
          var value = childSnapshot.val();
          if (!removed) {
            if (value == user_id) {
              //rm the user
              childSnapshot.ref.remove(function(err) {
                if (users.length == 1) {
                  //if last user left, set last_active_time and check for delete conditions after delay
                  setTimeout(bufferTimer, MAX_IDLE, room_id);
                  snapshot.ref.parent.child("last_active_time").set(Date.now());
                }
              });
              removed = true;
            }
          }
        });
      }
      else {
        console.log("FIREBASE: ERROR - room or user no longer exists");
      }
    });

    //rm the typing lol
    firebaseRoot.child("RoomTyping").child(room_id).child(user_id).remove();
  };

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
    //query room data to check delete conditions
    roomInfoDatabase.child(room_id).once("value").then(function(snapshot) {
      var room = snapshot.val();
      if (room) {
        if (!room.users) { //no users left
          //console.log("FIREBASE: checkToDelete - No more users left in room " + room_id);
          //console.log("FIREBASE: checkToDelete - Last active: " + room.last_active_time);
          var now = Date.now();
          if (now - room.last_active_time > MAX_IDLE) {
            //console.log("FIREBASE: checkToDelete - Would be deleting");
            if (room.host_id != MAIN_HOST) { //not a main room
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
    //remove room from roominfo, remove id from classroom list, remove room
    //messages database
    roomInfoDatabase.child(room_id).remove();
    classRoomsDatabase.child(class_id).child(firebase_push_id).remove();
    roomMessagesDatabase.child(room_id).remove();
  }


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


};

module.exports = new singletonRoomManager();
