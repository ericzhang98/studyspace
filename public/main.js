/***** General variables **************************/
var currRoomID = null;
/**************************************************/

/******************************** MODEL ******************************/

function Room(room_id, room_name, room_host_id, class_id, is_lecture, users) {
	this.room_id = room_id;
	this.name = room_name;
	this.host_id = room_host_id;
	this.class_id = class_id;
	this.is_lecture = is_lecture;
	this.users = users;
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
