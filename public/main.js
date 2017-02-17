/***** General variables **************************/
var currRoomID = null;
var songCommands = ["/raindrop", "/destress"];
var otherCommands = ["/gary", "/stop"]
var secretCommands = songCommands.concat(otherCommands);

var currSongAudio = null;
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
function doCommand(command) {

	// if it's a song
	if (songCommands.indexOf(command) != -1) {

		if (!currSongAudio) {

			// create a new audio element and make it play automatically
			var audio = document.createElement('audio');
			audio.volume = 0.3;
			audio.autoplay = true;

			// set the source
		    audio.src = "/audio/" + command.slice(1);

		   	// set the current song audio element
		    currSongAudio = audio;
		    
		    // add audio stream to the page
		    document.getElementById("myBody").insertBefore(audio, document.getElementById("myDiv"));
			
		}

		else {
			// change the source
			currSongAudio.src = "/audio/" + command.slice(1);
		}
	}

	else if (command == "/stop") {
		stopSong();
	}

	else if (command == "/gary") {
		return "That's a professionalism deduction.";
	}

	return null;
}

function stopSong() {
	if (currSongAudio) {
		document.getElementById("myBody").removeChild(currSongAudio);
		currSongAudio = null;
	}
}