var me = {user_id: "id2"}

var peer = new Peer(me.user_id, {key: 'tirppc8o5c9xusor'});
var myCalls = [];
var myTracks = {}; // Dictionary from call.id to audio track
var myStream = null;
var currRoomID = null;

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

console.log("Hello peer.js");

function call_button_on_click() {
	startCall(document.getElementById("target_id_input").value);
}

function hang_up_button_on_click() {
	leaveCalls();
}

function join_room2_button_on_click() {
	joinRoom("ucsd_cse_110_1");
}
function join_room1_button_on_click() {
	joinRoom("ucsd_cse_110_2");
}

function leave_room_button_on_click() {
	leaveRoom();
}


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

	// reference to the call so we can close it
	myCalls.push(call);

	console.log("my stream id is " + myStream.id)

	call.on('stream', function(remoteStream) {
		console.log("received stream with id " + remoteStream.id)

		addTrack(remoteStream, call.id);

	});

	call.on('close', function() {
		console.log("call closed");
	});
}

// - ensures myStream is set, delegates to answerCallHelper()
function answerCall(call) {
	console.log("call received from " + call.id)

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

	console.log("my stream id is " + myStream.id)
	call.on('stream', function(remoteStream) {

 		console.log("received stream with id " + remoteStream.id)	
		
		addTrack(remoteStream, call.id);
	});

	call.on('close', function() {
		console.log("call closed");
	});
}

// - creates audio track and stores in myTracks
function addTrack(remoteStream, call_id) {

	// create a new audio element
	var audio = document.createElement('audio');
	audio.autoplay = true;
	/*
	var test = document.createElement('p');
	var node = document.createTextNode("This is new.");
	test.appendChild(node);*/

    // set the source for our new element   
    audio.src = window.URL.createObjectURL(remoteStream); 

    // add it to the page
    document.getElementById("myBody").insertBefore(audio, document.getElementById("myDiv"));
    //document.getElementById("myBody").insertBefore(test, document.getElementById("myDiv"));

    // store the element in myTracks
    myTracks[call_id] = audio;
}

// - removes the audio track that corresponds to call_id
function removeTrack(call_id) {

	// remove the audio track from the page
	document.getElementById("myBody").removeChild(myTracks[call_id]);

	// remove the audio track from myTracks
	delete myTracks[call_id];
}

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

// - closes all calls and empties myCalls
function leaveCalls() {
	for (i = 0; i < myCalls.length; i++) {
		removeTrack(myCalls[i].id);
		myCalls[i].close();
	}
	myCalls = [];
}

