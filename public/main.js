/***** General variables **************************/
var currRoomID = null;
/**************************************************/

/****************************** ON-CLICKS ****************************/
function addRoomOnClick() {
	var class_id = $('#class_id input:radio:checked').val();
	var room_name = document.getElementById('room_name').value;
	var is_lecture = false;

	// TODO: check input here

	addRoom(class_id, room_name, is_lecture);
}
/*********************************************************************/
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
/*************************** CREATING ROOMS **************************/

function addRoom(class_id, room_name, is_lecture) {
	console.log("adding room with class_id: " + class_id + 
		", room_name: " + room_name);
	var xhr = new XMLHttpRequest();
	xhr.open('GET', "/add_room/" + class_id + "/" + 
		room_name + "/" + is_lecture, true);
	xhr.send();

	xhr.onreadystatechange = function(e) {
		// room has been created
		if (xhr.readyState == 4 && xhr.status == 200) {
			var response = JSON.parse(xhr.responseText);

			// join the room
			//joinRoom(response.room_id);
		}
	}
}

/*********************************************************************/
/************************* ACCOUNT MANAGEMENT ************************/

function logOut() {

	// leave current room
	leaveRoomHard();

	// erase cookies
	removeCookie("user_id");
	removeCookie("email");
	removeCookie("name");

	// go to home
	document.location.href = "/";
}

/*********************************************************************/
