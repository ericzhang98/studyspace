/***** General variables **************************/
var myID = getSignedCookie("user_id");
var SONG_COMMANDS = ["/raindrop", "/destress", "/420"];
var OTHER_COMMANDS = ["/gary", "/ord", "/stop", "/dank", "/scrub", "/nogary", "/noord"];
var SONG_VOLUMES = {
	"/raindrop" : 0.25,
	"/destress" : 0.3,
	"/420" : 0.13
}
var SECRET_COMMANDS = SONG_COMMANDS.concat(OTHER_COMMANDS);

var garyisms = ["That's a professionalism deduction.", "Don't touch the bananas, please.",
"Only handle it once.", "This isn't worth my time.", "What does 'DTF' mean?"];
var ordisms = ["Keep it simple, students.", "Start early, start often.", 
"If a simple boy from the midwest can do it, so can you.", "Think like a compiler."];
var bot_ids = ["gary_bot", "ord_bot"];

var currSongAudio = null;
document.getElementById('join_room_audio').volume = 0.4;
document.getElementById('leave_room_audio').volume = 0.4;

// set color theme
var tn = getCookie('theme_num');
var is_day = getCookie('is_day') == 'true';
setTheme(tn ? parseInt(tn) : 1);
setMode(is_day);
/**************************************************/

/******************************** MODEL ******************************/

function Room(room_id, room_name, room_host_id, class_id, is_lecture, users, host_name) {
	this.room_id = room_id;
	this.name = room_name;
	this.host_id = room_host_id;
	this.class_id = class_id;
	this.is_lecture = is_lecture;
	this.users = users;
	this.host_name = host_name;
}

/*********************************************************************/
/************************* ACCOUNT MANAGEMENT ************************/

//lol

/*********************************************************************/
/********************************* MISC ******************************/

function showAlert(alert_id, durationWord = 'normal', show_only_once = true) {

	var duration;
	switch (durationWord) {
		case 'short':
			duration = 3000;
			break;
		case 'long' :
			duration = 6000;
			break;
    case "longaf" :
      duration = 20000;
      break;
		default:
			duration = 4000;
	}

	$('#' + alert_id).show();

	setTimeout(function() {
		$("#" + alert_id).fadeOut(1000, function() {
			if (show_only_once) {
				$("#" + alert_id).alert('close');
			}
		});
	}, duration-1000);
}

/*********************************************************************/
/***************************** EASTER EGGS ***************************/

function doCommand(command, currRoomChatID) {

	// if it's a song
	if (SONG_COMMANDS.indexOf(command) != -1) {

		if (!currSongAudio) {

			// create a new audio element and make it play automatically
			var audio = document.createElement('audio');
			audio.volume = SONG_VOLUMES[command];
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
		var xhr = new XMLHttpRequest();
    xhr.open('GET', "/add_bot/gary_bot/" + currRoomChatID, true); // responds with class_ids
    xhr.send();
	}

	else if (command == "/nogary") {
		var xhr = new XMLHttpRequest();
    xhr.open('GET', "/remove_bot/gary_bot/" + currRoomChatID, true); // responds with class_ids
    xhr.send();
	}


	else if (command == "/ord") {
		var xhr = new XMLHttpRequest();
    xhr.open('GET', "/add_bot/ord_bot/" + currRoomChatID, true); // responds with class_ids
    xhr.send();
	}

	else if (command == "/noord") {
		var xhr = new XMLHttpRequest();
    xhr.open('GET', "/remove_bot/ord_bot/" + currRoomChatID, true); // responds with class_ids
    xhr.send();
	}

	else if (command == "/dank") {
    storeCookie("dank", true);
	}
  
  else if (command == "/scrub") {
    removeCookie("dank");
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
