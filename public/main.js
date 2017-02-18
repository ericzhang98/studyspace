/***** General variables **************************/
var currRoomID = null;
var songCommands = ["/raindrop", "/destress"];
var otherCommands = ["/gary", "/ord", "/stop"]
var secretCommands = songCommands.concat(otherCommands);

var garyisms = ["That's a professionalism deduction.", "Don't touch the bananas, please.",
"Only handle it once!", "This isn't worth my time.", "What does 'DTF' mean?"];
var ordisms = ["Keep it simple, students.", "Start early, start often!", 
"If a simple boy from the midwest can do it, so can you.", "Think like a compiler."];

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
/***************************** EASTER EGGS ***************************/

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
		if (garyisms.length == 0) {
			return "Gary says: I'm all out of things to say. Come back later.";
		}

		var index = Math.floor(Math.random()*garyisms.length);
		var msg = "Gary says: " + garyisms[index];
		garyisms.splice(index, 1);
		return msg;
	}

	else if (command == "/ord") {
		if (ordisms.length == 0) {
			return "Ord says: I'm all out of things to say. Come back later.";
		}

		var index = Math.floor(Math.random()*ordisms.length);
		var msg = "Ord says: " + ordisms[index];
		ordisms.splice(index, 1);
		return msg;
	}

	return null;
}

function stopSong() {
	if (currSongAudio) {
		document.getElementById("myBody").removeChild(currSongAudio);
		currSongAudio = null;
	}
}
/*********************************************************************/