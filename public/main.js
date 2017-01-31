var me = {user_id: "id1"};
var classes = {} 	// class_id : class
var rooms = {}		// room_id : room

function Class(class_id, class_name, room_ids) {
	this.class_id = class_id;	// "ucsd_cse_110_1"
	this.name = class_name; // "CSE 110 Gillespie"
	this.room_ids = [];
}

function Room(room_id, room_name, room_host_id, room_users, class_id, is_lecture, has_tutor) {
	this.room_id = room_id;
	this.name = room_name;
	this.host_id = room_host_id;
	this.users = room_users;
	this.class_id = class_id;
	this.is_lecture = is_lecture;
	this.has_tutor = has_tutor;
}

// - gets all class_ids for user
// - delegates to getClass
function getClasses() {
	var xhr = new XMLHttpRequest();
	xhr.open('GET', "/get_classes/" + me.user_id, true); // responds with class_ids
	xhr.send();

	xhr.onreadystatechange = function(e) {
		if (xhr.readyState == 4 && xhr.status == 200) {
			var response = JSON.parse(xhr.responseText);
			for (class_id in response.class_ids) {
				getClass(class_id);
			}
		}
	}
}

// - gets class_name and class_rooms for specified class
// - adds the class to the UI
// - calls getRoom on all the rooms for specified class
function getClass(class_id) {
	var xhr = new XMLHttpRequest();
	xhr.open('GET', "/get_class/" + class_id, true); // responds with the class's name and room_ids
	xhr.send();

	xhr.onreadystatechange = function(e) {
		if (xhr.readyState == 4 && xhr.status == 200) {
			var response = JSON.parse(xhr.responseText);
			classes[class_id] = new Class(class_id, response.name, response.room_ids);

			// TODO: update UI with this class

			for (room_id in response.room_ids) {
				getRoom(room_id);
			}
		}
	}
}

// - gets all room info for specified room
// - adds the room to the UI
function getRoom(room_id) {
	var xhr = new XMLHttpRequest();
	xhr.open('GET', "/get_room/" + room_id, true); // responds with all of the room's info
	xhr.send();

	xhr.onreadystatechange = function(e) {
		if (xhr.readyState == 4 && xhr.status == 200) {
			var response = JSON.parse(xhr.responseText);
			rooms[class_id] = new Room(room_id, response.name, response.host_id, 
				response.users, response.class_id, response.is_lecture, response.has_tutor);

			// TODO: update UI with this room
		}
	}
}