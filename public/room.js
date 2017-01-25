/***** General variables **************************/
var me = {user_id: "id2"}
var currRoomID = null;
/**************************************************/

/***** Audio conferencing variables ***************/
//var peer = new Peer(me.user_id, {key: 'tirppc8o5c9xusor'});
var peer = new Peer(me.user_id, {host: "localhost", port: "9000", path: '/peerjs'});

var myCalls = [];
var myRemoteStreams = {}; // Dictionary from call.id to audio track
var myStream = null;
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
/**************************************************/

/***** onClicks for testing ***********************/	
function call_button_on_click() {
	startCall(document.getElementById("target_id_input").value);
}

function hang_up_button_on_click() {
	leaveCalls();
}

function join_room1_button_on_click() {
	joinRoom("ucsd_cse_110_1_r0");
}

function join_room2_button_on_click() {
	joinRoom("ucsd_cse_105_1_r0");
}

function leave_room_button_on_click() {
	leaveRoom();
}

function mute_button_on_click() {
	toggleMyStreamAudioEnabled();
}

function mute_other_button_on_click() {
	toggleRemoteStreamAudioEnabled(document.getElementById("target_id_input").value);
}
/**************************************************/

/*********************** CALLING AND ANSWERING ***********************/

// Respond to open
peer.on('open', function(id) {
	console.log('My peer ID is: ' + id);
});

// Respond to call
peer.on('call', function(call) {
	answerCall(call);
});

// - ensures myStream is set, delegates to startCallHelper()
function startCall(other_user_id) {
	console.log("calling " + other_user_id);

	// myStream already set
	if (myStream != null) {
		console.log("myStream already set");
		startCallHelper(other_user_id);
	}		

	// myStream not yet set
	else {
		console.log("myStream not yet set");
		navigator.getUserMedia({video: false, audio: true}, function(stream) {
			myStream = stream;
			startCallHelper(other_user_id);
		}, function(err) {
			console.log('Failed to get local stream' ,err);
		});
	}
}

// - with myStream set, starts the call
function startCallHelper(other_user_id) {

	var call = peer.call(other_user_id, myStream);

	console.log("start call with id: " + call.id)

	// reference to the call so we can close it
	myCalls.push(call);

	console.log("outgoing stream id: " + myStream.id)

	call.on('stream', function(remoteStream) {
		console.log("incoming stream id: " + remoteStream.id)

		addRemoteStream(remoteStream, call.id);

	});

	// used for onClose
	var call_id = call.id;

	call.on('close', function() {
		console.log("call closed");

		// when a call closes, remove the corresponding stream
		removeRemoteStream(call_id);
	});
}

// - ensures myStream is set, delegates to answerCallHelper()
function answerCall(call) {
	console.log("received call with id " + call.id)

	// myStream already set
	if (myStream != null) {
		console.log("myStream already set");
		answerCallHelper(call);
	} 

	// myStream not yet set
	else {
		console.log("myStream not yet set");
		navigator.getUserMedia({video: false, audio: true}, function(stream) {
	    	myStream = stream;
	    	answerCallHelper(call);
		}, function(err) {
			console.log('Failed to get local stream' ,err);
		});
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
		
		addRemoteStream(remoteStream, call.id);
	});

	// used for onClose
	var call_id = call.id;

	call.on('close', function() {
		console.log("call closed");

		// when a call closes, remove the corresponding stream
		removeRemoteStream(call_id);
	});
}
/*********************************************************************/

/********************* LEAVING AND JOINING ROOMS *********************/

// - updates server and returns list of user_id's
// - calls all user_id's
function joinRoom(room_id) {

	// we're already in this room!
	if (currRoomID == room_id) {
		return;
	}

	// don't want to be in two rooms at once
	if (currRoomID != null) {
		leaveRoom();
	}

	console.log("joining room with id " + room_id);

	// set currRoomID
	currRoomID = room_id;

	// send request to server
	var xhr = new XMLHttpRequest();
	xhr.open('GET', "/join_room/" + room_id + "/" + me.user_id, true);
	xhr.send();

	// on response
	xhr.onreadystatechange = function(e) {
		if (xhr.readyState == 4 && xhr.status == 200) {

	        var response = JSON.parse(xhr.responseText);

	        // call all those users
	        for (i = 0; i < response.other_user_ids.length; i++) {
	        	var other_user_id = response.other_user_ids[i];
	        	console.log(other_user_id);
	        	console.log(me.user_id);
	        	if (other_user_id != me.user_id) {
	        		startCall(other_user_id);
	    		}
	        }
    	}
	}
}

// - updates server and leave all current calls
function leaveRoom() {

	// are we even in a room?
	if (currRoomID != null) {
		console.log("leaving room with id " + currRoomID);

		// leave our calls
		leaveCalls();

		// send request to server to tell them we left
		var xhr = new XMLHttpRequest();
		xhr.open('GET', "/leave_room/" + currRoomID + "/" + me.user_id, true);
		xhr.send();

		// reset currRoomID
		currRoomID = null;
	}
}

// - creates audio track and stores in myRemoteStreams
function addRemoteStream(remoteStream, call_id) {

	// create a new audio element and make it play automatically
	var audio = document.createElement('audio');
	audio.autoplay = true;

    // set the source for our new element   
    audio.src = window.URL.createObjectURL(remoteStream); 

    // add it to the page
    document.getElementById("myBody").insertBefore(audio, document.getElementById("myDiv"));

    // store the element in myRemoteStreams
    myRemoteStreams[call_id] = audio;
}

// - removes the audio track that streaming the remoteStream from call_id
function removeRemoteStream(call_id) {

	// remove the audio track from the page
	document.getElementById("myBody").removeChild(myRemoteStreams[call_id]);

	// remove the remoteStream from myRemoteStreams
	delete myRemoteStreams[call_id];
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
	myStream.getAudioTracks()[0].enabled = !(myStream.getAudioTracks()[0].enabled);
}

// - toggle audio from another person
function toggleRemoteStreamAudioEnabled(call_id) {
	console.log(myRemoteStreams);
	myRemoteStreams[call_id].muted = !(myRemoteStreams[call_id].muted);
}
/*********************************************************************/

/******************************* MISC ********************************/
// when the window is about to close
window.onbeforeunload = function(event) {
	// send request to server to tell them we left
	// we don't use leaveRoom because request needs to be async
	if (currRoomID != null) {
		var xhr = new XMLHttpRequest();
		xhr.open('GET', "/leave_room/" + currRoomID + "/" + me.user_id, false);
		xhr.send();
	}
};
/*********************************************************************/