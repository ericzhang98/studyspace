/***** General variables **************************/
var myID = getSignedCookie("user_id");
var currTheme;
var NUM_THEMES = 6;
var songCommands = ["/raindrop", "/destress"];
var otherCommands = ["/gary", "/ord", "/stop"]
var secretCommands = songCommands.concat(otherCommands);

var garyisms = ["That's a professionalism deduction.", "Don't touch the bananas, please.",
"Only handle it once.", "This isn't worth my time.", "What does 'DTF' mean?"];
var ordisms = ["Keep it simple, students.", "Start early, start often.", 
"If a simple boy from the midwest can do it, so can you.", "Think like a compiler."];

var currSongAudio = null;
document.getElementById('join_room_audio').volume = 0.4;
document.getElementById('leave_room_audio').volume = 0.4;

// set color theme
setTheme(parseInt(getCookie('theme_num')));
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
/********************************* MISC ******************************/

function showAlert(alert_id, duration) {
	$('#' + alert_id).show();

	setTimeout(function() { // this will automatically close the alert and remove this if the users doesnt close it in 5 secs

		$('#' + alert_id).alert('close')

	}, duration);
}

function changeTheme() {
	
	setTheme(currTheme + 1 <= NUM_THEMES ? currTheme + 1 : 1);

	// play pop sound
	var audio = document.createElement("audio");
	audio.src = "/audio/pop_sfx";
	audio.addEventListener("ended", function () {
        document.removeChild(this);
    }, false);
    audio.volume = 0.4;
    audio.play(); 
}

function setTheme(theme_num) {

	var prim, prim_light, prim_dark, base, base_two, base_focus, over_base, over_base_two, over_base_focus;

	if (theme_num == null) {
		setTheme(1);
		return;
	}

	switch (theme_num) {

		// THEME NUM BASE-PRIMARY-ACCENT

		// THEME 1 DARK-BLUE-YELLOW
		case 1:
			prim = '#38c9ff';
			prim_light = '#91e0ff';
			prim_dark = '#00b9ff';
			base = '#353535';
			base_two = '#262626';
			base_focus = '#262626';
			over_base = '#ffffff';
			over_base_focus ='#ffffff';
			accent = '#ffbb00'; 
			break;

		// THEME 2 DARK-MAROON-RED
		case 2:
			prim = '#d80059';
			prim_light = '#d80059';
			prim_dark = '#d80059';
			base = '#353535';
			base_two = '#262626';
			base_focus = '#262626';
			over_base = '#ffffff';
			over_base_focus ='#ffffff';
			accent = '#ff1443'; 
			break;

		// THEME 3 LIGHT-BLUE-PINK
		case 3:
			prim = '#0079e5';
			prim_light = '#0079e5';
			prim_dark = '#004684';
			base = '#f9f7f7';
			base_two = '#ffffff';
			base_focus = '#3a3a3a';
			over_base = '#353535';
			over_base_focus ='#ffffff';
			accent = '#e01f4f'; 
			break;

		// THEME 4 LIGHT-GREEN-BLUE
		case 4:

			prim = '#00d11b';
			prim_light = '#00d11b';
			prim_dark = '#00d11b';
			base = '#f9f7f7';
			base_two = '#ffffff';
			base_focus = '#3a3a3a';
			over_base = '#353535';
			over_base_focus ='#ffffff';
			accent = '#42ccff'; 
			break;


		// THEME 5 AQUA-BLACK-NAVY
		case 5:

			prim = '#353535';
			prim_light = '#353535';
			prim_dark = '#353535';
			base = '#42ccff';
			base_two = '#f9f9f9';
			base_focus = '#f9f9f9';
			over_base = '#ffffff';
			over_base_two = '#353535';
			over_base_focus ='#42ccff';
			accent = '#004f7c'; 
			break;

		case 6:

			prim = '#262626';
			prim_light = '#262626';
			prim_dark = '#262626';
			base = '#cc0025';
			base_two = '#f9f9f9';
			base_focus = '#f9f9f9';
			over_base = '#ffffff';
			over_base_two = '#262626';
			over_base_focus ='#cc0025';
			accent = '#4c0015'; 
			break;

		default:
			return;
	}

	over_base_two = over_base_two ? over_base_two : over_base;

	document.documentElement.style.setProperty('--primary-color', prim);
	document.documentElement.style.setProperty('--primary-light-color', prim_light);
	document.documentElement.style.setProperty('--primary-dark-color', prim_dark);
	document.documentElement.style.setProperty('--base-color', base);
	document.documentElement.style.setProperty('--base-two-color', base_two);
	document.documentElement.style.setProperty('--base-focus-color', base_focus);
	document.documentElement.style.setProperty('--over-base-color', over_base);
	document.documentElement.style.setProperty('--over-base-two-color', over_base_two);
	document.documentElement.style.setProperty('--over-base-focus-color', over_base_focus);
	document.documentElement.style.setProperty('--accent-color', accent);

	currTheme = theme_num;
	storeCookie("theme_num", theme_num);
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