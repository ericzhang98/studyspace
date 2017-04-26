/***** General variables **************************/
var logger = new Logger(true);
var myID = getSignedCookie("user_id");
var SONG_COMMANDS = ["/raindrop", "/destress", "/420"];
var OTHER_COMMANDS = ["/stop", "/dank", "/scrub", "/easter"];
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

var currSongAudio = null;
document.getElementById('join_room_audio').volume = 0.4;
document.getElementById('leave_room_audio').volume = 0.4;

// set color theme
var tn = getCookie('theme_num');
var is_day = getCookie('is_day') == 'true';
setTheme(tn ? parseInt(tn) : 1);
setMode(is_day);
/**************************************************/
// Sidebar setup, makes sure that at most one class is open at a time
$('#classes').on('show.bs.collapse','.collapse', function() {
	$('#classes').find('.collapse.in').collapse('hide');
});
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

	else if (command == "/dank") {
    storeCookie("dank", true);
	}
  
  else if (command == "/scrub") {
    removeCookie("dank");
  }

  else if (command == "/easter") {
  	var string = "Try some of the following: \n"
  	for (var i = 0; i < SECRET_COMMANDS.length; i++) {
  		if (SECRET_COMMANDS[i] != "/easter") {
  			string += SECRET_COMMANDS[i] + "\n";
  		}
  	}

  	return string;
  }

	return null;
}

function stopSong() {
	if (currSongAudio) {
		document.getElementById("myBody").removeChild(currSongAudio);
		currSongAudio = null;
	}
}

function playSong(url) {
  //console.log(url);
  var player = document.getElementById("iframePlayer");
  //embed format
  //player.src = "https://www.youtube.com/embed/S-sJp1FfG7Q?rel=0&autoplay=1";

  //youtube url format #1
  //  https://www.youtube.com/watch?v=S-sJp1FfG7Q
  if (url.indexOf("youtube.com") != -1) {
    var youtubeDirtyId = url.split("/watch?v=")[1];
    //clean up the dirty id
    var youtubeCleanId = null;
    if (youtubeDirtyId) {
      youtubeCleanId = youtubeDirtyId.split("?")[0];
      youtubeCleanId = youtubeCleanId.split("&")[0];
    }
    if (youtubeCleanId) {
      var fullUrl = "https://www.youtube.com/embed/" + youtubeCleanId + "?rel=0&autoplay=1";
      //console.log(fullUrl);
		  stopSong();
      player.src = fullUrl;
    }
  }

  //youtube url format #2
  //  https://youtu.be/S-sJp1FfG7Q
  else if (url.indexOf("youtu.be") != -1) {
    var youtubeArr = url.split("/");
    if (youtubeArr) {
      var youtubeDirtyId = youtubeArr[youtubeArr.length-1]; 
      //clean up the dirty id
      var youtubeCleanId = null;
      if (youtubeDirtyId) {
        youtubeCleanId = youtubeDirtyId.split("?")[0];
      }
      if (youtubeCleanId) {
        var fullUrl = "https://www.youtube.com/embed/" + youtubeCleanId + "?rel=0&autoplay=1";
        //console.log(fullUrl);
		    stopSong();
        player.src = fullUrl;
      }
    }
  }

}

/*********************************************************************/
