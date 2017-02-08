/***** General variables **************************/
var me = {user_id: "id1"};
var class_rooms = {} 	// class_id : class rooms
var class_names = {} 	// class_id : class name
var rooms = {}			// room_id : room
/**************************************************/

getClasses();

/******************************** MODEL ******************************/

function Room(room_id, room_name, room_host_id, room_users, class_id, is_lecture, has_tutor) {
	this.room_id = room_id;
	this.name = room_name;
	this.host_id = room_host_id;
	this.users = room_users;
	this.class_id = class_id;
	this.is_lecture = is_lecture;
	this.has_tutor = has_tutor;
}

/*********************************************************************/

/************************* GET CLASSES & ROOMS ***********************/

// - gets all class_ids for user
// - delegates to getClass
function getClasses() {
	console.log("Getting classes...")
	var xhr = new XMLHttpRequest();
	xhr.open('GET', "/get_classes/" + me.user_id, true); // responds with class_ids
	xhr.send();

	xhr.onreadystatechange = function(e) {
		if (xhr.readyState == 4 && xhr.status == 200) {
			var response = JSON.parse(xhr.responseText);
			console.log(response.class_ids);
			for (i = 0; i < response.class_ids.length; i++) {
				getClass(response.class_ids[i]);
			}
		}
	}
}

// - gets class_name and class_rooms for specified class
// - adds the class to the UI
// - calls getRoom on all the rooms for specified class
function getClass(class_id) {
	console.log("Getting class with id " + class_id);

	// add listener for class rooms
	classRoomsDatabase.child(class_id).on("value", function(snapshot) {

        var class_rooms = snapshot.val();

        if (class_rooms) {
        	onClassRoomsChange(class_id, Object.values(class_rooms));
        }

    });

	// get class name
	var xhr = new XMLHttpRequest();
	xhr.open('GET', "/get_class/" + class_id, true); // responds with the class's name and room_ids
	xhr.send();

	xhr.onreadystatechange = function(e) {
		if (xhr.readyState == 4 && xhr.status == 200) {

			// store the class
			var response = JSON.parse(xhr.responseText);
			class_names[class_id] = response.name;

			console.log("class name is: " + response.name);

			// TODO: update UI to add the class
		}
	}
}

// - respond to change in a class's rooms
// - calls removeRoom/getRoom accordingly
function onClassRoomsChange(class_id, updated_rooms) {

	console.log("rooms for class " + class_id + " are now " + updated_rooms);
	
	// if we have a previous record of this class
	if (class_rooms[class_id] != null) {	

		// remove old rooms
		for (i = 0; i < class_rooms[class_id].length; i++) {
			var room_id = class_rooms[class_id][i]; 

			// if they aren't in the new list
			if (updated_rooms.indexOf(room_id) == -1) {
				removeRoom(room_id);
			}
		}
	}

	// get new rooms
	for (i = 0; i < updated_rooms.length; i++) {

		var room_id = updated_rooms[i];

		// only if we haven't already gotten it
		if (class_rooms[class_id] == null || 
			class_rooms[class_id].indexOf(room_id) == -1) {
			getRoom(class_id, room_id);
		}
	}

	// set the rooms for this class to the updated version
	class_rooms[class_id] = updated_rooms;
}

// - gets all room info for specified room
// - adds the room to rooms and the UI
function getRoom(class_id, room_id) {
	console.log("Getting room with id " + room_id);

	// add listener for room info
	roomsDatabase.child(room_id).on("value", function(snapshot) {

		var room = snapshot.val();

        if (room) {

			// TODO: update UI to add the room

        	// store the room
        	rooms[room_id] = new Room(room_id, room.name, room.host_id, room.class_id,
        		room.is_lecture, room.has_tutor, room.users);

			console.log("Got room: ");
			console.log(rooms[room_id]);
        }
	});
}

// - removes room from rooms and the UI
function removeRoom(room_id) {

	console.log("Removing room with id " + room_id);

	roomsDatabase.child(room_id).off();

	delete rooms[room_id];

	// TODO: update UI
}
/*********************************************************************/

/*************************** CREATING ROOMS **************************/

function addRoom(class_id, room_name, is_lecture) {
	console.log("adding room with class_id: " + class_id + 
		", room_name: " + room_name);
	var xhr = new XMLHttpRequest();
	xhr.open('GET', "/add_room/" + class_id + "/" + 
		room_name + "/" + me.user_id + "/" + is_lecture, true);
	xhr.send();

	xhr.onreadystatechange = function(e) {
		// room has been created
		if (xhr.readyState == 4 && xhr.status == 200) {
			var response = JSON.parse(xhr.responseText);

			// join the room
			joinRoom(response.room_id);
		}
	}
}

/*********************************************************************/
