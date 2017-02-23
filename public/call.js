/***** General variables **************************/
var me = {user_id: "id2", block_list: ["block1"]};
var currRoomUsers = [];
var isLecturer = false;		// am I giving a lecture?
/**************************************************/

/***** Audio conferencing variables ***************/
//var peer = new Peer(myID, {host: "localhost", port: "9000", path: '/peerjs'});
var peer = new Peer(myID, 
    {host: "pacific-lake-64902.herokuapp.com", port: "",  path: '/peerjs'});
peer._lastServerId = myID;
var PEER_PING_PERIOD = 30000;
var myStream = null;
var myCalls = [];
var myRemoteStreams = {}; // Dictionary from user.id to audio track
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

// Grab user media immediately
getVoice();

/*********************** CALLING AND ANSWERING ***********************/

// Grab user media (voice)
function getVoice(callback) {
	navigator.getUserMedia({video: false, audio: true}, function(stream) {
		myStream = stream;
		showAlert("voice-connect-alert", 4000);
		if (callback) {
			callback();
		}
	}, function(err) {
		console.log('Failed to get local stream', err);
	});
}

// Respond to open
peer.on('open', function() {
console.log('My peer ID is: ' + peer.id);
  //setup heartbeat ping after 5 seconds (wait for socket to finish httpr)
  setTimeout(pingPeerServer, 5000, true);
});

// Respond to call
peer.on('call', function(call) {

	// If the user isn't blocked, answer the call
	if (me.block_list.indexOf(call.peer) == -1) {
		answerCall(call);
	}

});

peer.on("disconnected", function() {
  console.log("DISCONNECTED");
});

peer.on("error", function(err) {
  console.log(err);
});

//pings peer server, pass in true for constant 30 sec ping
function pingPeerServer(constant) {
  peer.socket.send({type:"Ping"});
  if (constant) {
    setTimeout(pingPeerServer, PEER_PING_PERIOD, true);
  }
}

// - ensures myStream is set, delegates to startCallHelper()
function startCall(other_user_id) {
	console.log("calling " + other_user_id);

	// do not send out calls to users that we've blocked
	if (me.block_list.indexOf(other_user_id) != -1) {
		return;
	}

	// myStream already set
	if (myStream != null) {
		console.log("myStream already set");
		startCallHelper(other_user_id);
	}		

	// myStream not yet set
	else {
		console.log("myStream not yet set");
		getVoice(startCallHelper(other_user_id));
	}
}

// - with myStream set, starts the call
function startCallHelper(other_user_id) {
	
	var call = peer.call(other_user_id, myStream);

	console.log("sent call to user with id: " + call.peer)

	// reference to the call so we can close it
	myCalls.push(call);

	console.log("outgoing stream id: " + myStream.id)

	call.on('stream', function(remoteStream) {
		console.log("incoming stream id: " + remoteStream.id)

		establishCall(remoteStream, call.peer);
	});

	// used for onClose
	var call_id = call.id;

	call.on('close', function() {
		console.log("call closed");
		destablishCall(call.peer);
	});
}

// - ensures myStream is set, delegates to answerCallHelper()
function answerCall(call) {
	console.log("received call from user with id: " + call.peer)

	// myStream already set
	if (myStream != null) {
		console.log("myStream already set");
		answerCallHelper(call);
	} 

	// myStream not yet set
	else {
		console.log("myStream not yet set");
		getVoice(answerCallHelper(call));
	}
}

// - with myStream set, answers the call
function answerCallHelper(call) {

	// Answer the call with an A/V stream
	call.answer(myStream); 
    	
	// reference to the call so we can close it
	myCalls.push(call);

	console.log("outgoing stream id: " + myStream.id)
	call.on('stream', function(remoteStream) {
		console.log("incoming stream id: " + remoteStream.id)	

		establishCall(remoteStream, call.peer);
	});

	// used for onClose
	var call_id = call.id;

	call.on('close', function() {
		console.log("call closed");
		destablishCall(call.peer);
	});
}

// just calls addRemoteStream and plays the sound effect
function establishCall(remoteStream, peer_id) {
		
	// add their stream
	addRemoteStream(remoteStream, peer_id);

	// play join room sound
	document.getElementById('join_room_audio').play();
}

// just calls removeRemoteStream and plays the sound effect
function destablishCall(peer_id) {

	// remove their stream
	removeRemoteStream(peer_id);

	// play leave room sound
	document.getElementById('leave_room_audio').play();
}

/*********************************************************************/
/********************* LEAVING AND JOINING ROOMS *********************/

// - updates server and returns list of user_id's
// - calls all user_id's
function joinRoomCall(currRoomCallID) {

	console.log("joining room call with id " + currRoomCallID);

	// send request to server
	var xhr = new XMLHttpRequest();
	xhr.open('GET', "/join_room/" + currRoomCallID, true);
	xhr.send();

	// on response
	xhr.onreadystatechange = function(e) {
		if (xhr.readyState == 4 && xhr.status == 200) {

	        var response = JSON.parse(xhr.responseText);

	        // room no longer exists
            console.log(response);
	        if (response.room_id == null) {
	        	console.log("room does not exist");
	        	return;
	        }

	        // set the onload function to use the new room id
	        setOnBeforeUnload(currRoomCallID);

	        // if this is a lecture and I am the host, I am the lecturer
	        isLecturer = (response.is_lecture && response.host_id == myID);

	        if (response.is_lecture) {
	        	showAlert("lecture-alert", 6000);
	        }
	        
	        // if this is a lecture-style room and I am not the lecturer,
	        // then I only call the lecturer
	        if (response.is_lecture && !isLecturer) {
	        	startCall(response.host_id);

	        	// do not send out my audio
	        	setMyStreamAudioEnabled(false);	

	        	// TODO: disable unmute button
	        }

	      	// if I am a lecturer or this is a normal room
	        else {

	        	// by default, unmute me
	        	setMyStreamAudioEnabled(true);

	        	// call everyone
	        	var usersArray = Object.values(response.users);

		        for (i = 0; i < usersArray.length; i++) {
		        	var other_user_id =usersArray[i];
		        	console.log("assessing " + other_user_id);
		        	if (other_user_id != myID) {
		        		startCall(other_user_id);
		    		}
		        }
	    	}
    	}
	}
}

// - updates server and leaves all current calls
function leaveRoom(currRoomCallID) {

	// are we even in a room?
	if (currRoomCallID != null) {
		console.log("leaving room with id " + currRoomCallID);

		// leave our calls
		leaveCalls();

		// send request to server to tell them we left
		var xhr = new XMLHttpRequest();
		xhr.open('GET', "/leave_room/" + currRoomCallID, true);
		xhr.send();

		// stop any song playing
		stopSong();
	}
}

// - creates audio track and stores in myRemoteStreams
function addRemoteStream(remoteStream, user_id) {

	// create a new audio element and make it play automatically
	var audio = document.createElement('audio');
	audio.autoplay = true;

	// set the source
    audio.src = window.URL.createObjectURL(remoteStream); 

    // store the element in myRemoteStreams
    myRemoteStreams[user_id] = audio;

    // if I am the lecturer, I want everyone else muted by default
	if (isLecturer) {
		toggleRemoteStreamAudioEnabled(user_id);
	}

    // add audio stream to the page
    document.getElementById("myBody").insertBefore(audio, document.getElementById("myDiv"));
}

// - removes the audio track that streaming the remoteStream from call_id
function removeRemoteStream(user_id) {

	// remove the audio track from the page
	document.getElementById("myBody").removeChild(myRemoteStreams[user_id]);

	// remove the remoteStream from myRemoteStreams
	delete myRemoteStreams[user_id];
}

// - removes all {user_id: call} pairs in myCalls and closes calls
// - removes all {call.id: audio} pairs myRemoteStreams and removes audio tracks
function leaveCalls() {
	for (var i = 0; i < myCalls.length; i++) {
		myCalls[i].close();
	}
	myCalls = [];
}
/*********************************************************************/
/********************** MUTING / UNMUTING AUDIO **********************/

// - toggle my own audio
function toggleMyStreamAudioEnabled() {
	//console.log("toggling my audio to " + !(myStream.getAudioTracks()[0].enabled));
	myStream.getAudioTracks()[0].enabled = !(myStream.getAudioTracks()[0].enabled);
}

// - set my audio
function setMyStreamAudioEnabled(enabled) {
	if (myStream) {
		//console.log("setting my audio to " + enabled);
		myStream.getAudioTracks()[0].enabled = enabled;
	}
}

// - toggle audio from another person
function toggleRemoteStreamAudioEnabled(user_id) {
	//console.log("toggling remote audio to " + !(myRemoteStreams[user_id].muted));
	myRemoteStreams[user_id].muted = !(myRemoteStreams[user_id].muted);
}
/*********************************************************************/
/******************************* MISC ********************************/

function setOnBeforeUnload(currRoomCallID) {
	// when the window is about to close
	window.onbeforeunload = function(event) {
		// send request to server to tell them we left
		leaveRoomHard(currRoomCallID);
	};
}

// makes sure we leave the room
function leaveRoomHard(currRoomCallID) {
	if (currRoomCallID != null) {
		var xhr = new XMLHttpRequest();
		xhr.open('GET', "/leave_room/" + currRoomCallID, false);
		xhr.send();
	}
}
/*********************************************************************/
