/* Used for pulling, updating, and storing classes, rooms, and users (C-R-U) */
/* Exists as singleton within Angular app */

function CRUHandler() {

  /***** Public Variables ***************************/
  this.my_class_ids = [];   // a list of my class ids
	this.classes = {};        // class_id : class
  this.class_rooms = {};    // class_id : list of room_ids
  this.rooms = {};          // room_id : room, listened to after grabbing classes
  this.users = {};          // user_id : user, info added as u join rooms
  /**************************************************/

  /***** Private Variables **************************/
  const thisCH = this;  // a reference to this cruContainer object
  var onChangeFunc = null; // function to execute when something changes
  /**************************************************/

  /***** Initialization *****************************/
	getClasses(this);
  /**************************************************/

  /************************** Public Functions *************************/
  // - returns name of a room
  this.getNameOfRoom = function(room_id) {
    if (this.rooms[room_id]) {
      return this.rooms[room_id].name;
    }
    return "";
  }

  // - returns class name of a room
  this.getClassNameOfRoom = function(room_id) {
    if (this.rooms[room_id] && this.classes[this.rooms[room_id].class_id]) {
      return this.classes[this.rooms[room_id].class_id].name;
    }
    return "";
  }

  // - returns whether a user is a tutor in a given room
  this.isTutor = function(user_id, room_chat_id) {
    //assume ppl aren't tutors until we grab class info
    if (this.rooms[room_chat_id]) {
      return this.classes[this.rooms[room_chat_id].class_id].tutor_ids &&
      this.classes[this.rooms[room_chat_id].class_id].tutor_ids.indexOf(user_id) != -1;
    }
    else {
      return false;
    }
  }

  // - sets a callback function to be executed 
  //   when a soundMeter's loudness changes
  this.setOnChangeFunc = function(func) {
    onChangeFunc = func;
  }
  /*********************************************************************/

  /************************* Private Functions *************************/

  // - gets all class_ids for user
  // - delegates to getClass
  function getClasses(cruHandler) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', "/get_my_classes", true); // responds with class_ids
    xhr.send();

    xhr.onreadystatechange = function(e) {
      if (xhr.readyState == 4 && xhr.status == 200) {
        var response = JSON.parse(xhr.responseText);

        // Set this scope variable (used in create room)
        if (response.class_ids) {
          cruHandler.my_class_ids = response.class_ids;
        }

        cruHandler.my_class_ids.push('lounge_id');

        // Get more data
        for (i = 0; i < cruHandler.my_class_ids.length; i++) {
          getClass(cruHandler, cruHandler.my_class_ids[i]);
        }
      }
    }
  }

  // - gets class_name and class_rooms for specified class
  // - adds the class to the UI
  // - calls getRoom on all the rooms for specified class
  function getClass(cruHandler, class_id) {

    // get class info
    var xhr = new XMLHttpRequest();
    xhr.open('GET', "/get_class/" + class_id, true); // res with the class's name and room_ids
    xhr.send();

    xhr.onreadystatechange = function(e) {
      if (xhr.readyState == 4 && xhr.status == 200) {

        // store the class name
        var response = JSON.parse(xhr.responseText);
        response.name = response.name.toLowerCase();
        response.rooms_with_tutors = [];

        cruHandler.classes[class_id] = response;

        // update UI
        onChangeFunc({change_type: "getClass", class_id : class_id});

        // add listener for class rooms
        classRoomsDatabase.child(class_id).on("value", function(snapshot) {
          if (snapshot.val()) {
            onClassRoomsChange(cruHandler, class_id, Object.values(snapshot.val()));
          }
        });
      }
    }
  }

  // - respond to change in a class's rooms
  // - calls removeRoom/getRoom accordingly
  function onClassRoomsChange(cruHandler, class_id, updated_rooms) {

    // save a copy of the current rooms
    var curr_rooms = cruHandler.class_rooms[class_id] ? cruHandler.class_rooms[class_id] : [];

    // update our rooms
    cruHandler.class_rooms[class_id] = updated_rooms;

    // if there is a change, apply it
    // needed for case that a room is deleted, but none are added
    if (curr_rooms != updated_rooms) {
      onChangeFunc();
    }

    // detach listeners for removed rooms
    for (i = 0; i < curr_rooms.length; i++) {
      // if this room is not in the new rooms, detach listener
      if (updated_rooms.indexOf(curr_rooms[i]) == -1) {
        roomsDatabase.child(curr_rooms[i]).off();
      }
    }

    // get the new rooms
    for (i = 0; i < updated_rooms.length; i++) {
      // if we weren't already listening to this room, get it
      if (curr_rooms.indexOf(updated_rooms[i]) == -1) {
        getRoom(cruHandler, updated_rooms[i]);
      }
    }
  }

  // - finds the room's data and adds it to the list of rooms
  function getRoom(cruHandler, room_id) {

    // add listener for room info
    roomsDatabase.child(room_id).on("value", function(snapshot) {

      var room = snapshot.val();

      if (room) {

        var roomUniqueUsers = [];
        //rm duplicate users
        if (room.users) {
          roomUniqueUsers = Object.values(room.users);
          roomUniqueUsers = roomUniqueUsers.filter(function(element, index, self) {
            return index == self.indexOf(element);
          });
        }

        // update the room
        cruHandler.rooms[room_id] = new Room(room_id, room.name, room.host_id, room.class_id, 
                                         room.is_lecture, roomUniqueUsers, room.host_name ? room.host_name : "Unknown host");


        // are there tutors in here?
        detectTutors(cruHandler, cruHandler.rooms[room_id]);

        // how many people are studying for this class now?
        setNumUsers(cruHandler, cruHandler.rooms[room_id].class_id);

        // get room users
        updateRoomUsers(cruHandler, cruHandler.rooms[room_id]);

        // update currTyping ppl
        //updateCurrTyping();

        onChangeFunc();
      }
    });
  }

  // Set the number of total users studying for a class at the moment
  function setNumUsers(cruHandler, class_id) {
    ////console.log("setting num users for " + class_id);
    cruHandler.classes[class_id].num_users = 0;

    for (i = 0; i < cruHandler.class_rooms[class_id].length; i++) {
      var room = cruHandler.rooms[cruHandler.class_rooms[class_id][i]];

      // if there are users in this room
      if (room && room.users) {
        // add them to the number of users in this class
        cruHandler.classes[class_id].num_users += room.users.length;
      }
    }
  }

  // check if there is a tutor present in a room
  // update rooms and classes accordingly
  function detectTutors(cruHandler, room) {

    var tutor_ids = cruHandler.classes[room.class_id].tutor_ids;

    // if this class has tutors
    if (tutor_ids && room.users) {

      for (var i = 0; i < room.users.length; i++) {
        var has_tutor = false;
        // if there is a tutor in this room or a tutor hosting this room
        if (tutor_ids.indexOf(room.users[i]) != -1) {
          has_tutor = true;
          break;
        }
      }

      room.has_tutor = has_tutor;
      var r_index = cruHandler.classes[room.class_id].rooms_with_tutors.indexOf(room.room_id);

      // if we weren't a tutor room before and we are now
      if (r_index == -1 && room.has_tutor) {
        cruHandler.classes[room.class_id].rooms_with_tutors.push(room.room_id);
      }

      // if we used to be a tutor room and we aren't anymore
      else if (r_index != -1 && !room.has_tutor) {
        cruHandler.classes[room.class_id].rooms_with_tutors.splice(r_index, 1);
      }
    }
  }

  // getting the list of users in this room
  function updateRoomUsers(cruHandler, room, callback) {
    ////console.log("this is a room " + room);
    if (room) {
      ////console.log("getting new list of users for room: " + room.room_id);
      ////console.log(this.rooms);
      for (var i = 0; i < room.users.length; i++) {

        // if we don't have this user's data, get it and at it to users
        if (!(room.users[i] in cruHandler.users)) {
          var id = room.users[i];

          var xhr = new XMLHttpRequest();
          xhr.open('GET', "/get_user/" + room.users[i], true); // responds with class_ids
          xhr.send();

          xhr.onreadystatechange = function(e) {
            if (xhr.readyState == 4 && xhr.status == 200) {
              var response = JSON.parse(xhr.responseText);
              cruHandler.users[response.user_id] = response;
              //console.log("user info pulled: " + response.data.name + " " + response.data.user_id);
              if (callback){callback();}
            }
          }
        }
      }
    }
  }
  /*********************************************************************/
}
