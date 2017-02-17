/***** General variables **************************/
var me = {user_id: "id2", block_list: ["block1"]};
var myID = getSignedCookie("user_id");
var currRoomUsers = [];
var isLecturer = false;		// am I giving a lecture?
/**************************************************/

/***** Audio conferencing variables ***************/
//var peer = new Peer(myID, {host: "localhost", port: "9000", path: '/peerjs'});
var peer = new Peer(myID, 
    {host: "pacific-lake-64902.herokuapp.com", port: "",  path: '/peerjs'});
peer._lastServerId = myID;
var myStream = null;
var myCalls = [];
var myRemoteStreams = {}; // Dictionary from call.id to audio track
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

// Grab user media immediately
navigator.getUserMedia({video: false, audio: true}, function(stream) {
	myStream = stream;
}, function(err) {
	console.log('Failed to get local stream' ,err);
});

/*********************** CALLING AND ANSWERING ***********************/

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
    setTimeout(pingPeerServer, 30000, true);
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

	console.log("sent call to user with id: " + call.peer)

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
	console.log("received call from user with id: " + call.peer)

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
function joinRoomCall() {

	console.log("joining room with id " + currRoomID);

	// send request to server
	var xhr = new XMLHttpRequest();
	xhr.open('GET', "/join_room/" + currRoomID, true);
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

			// listen to the room
			//listenToRoom();

	        // if this is a lecture and I am the host, I am the lecturer
	        isLecturer = (response.is_lecture && response.host_id == myID);
	        
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
function leaveRoom() {

	// are we even in a room?
	if (currRoomID != null) {
		console.log("leaving room with id " + currRoomID);

		// leave our calls
		leaveCalls();

		// send request to server to tell them we left
		var xhr = new XMLHttpRequest();
		xhr.open('GET', "/leave_room/" + currRoomID, true);
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

    // store the element in myRemoteStreams
    myRemoteStreams[call_id] = audio;

    // if I am the lecturer, I want everyone else muted by default
	if (isLecturer) {
		toggleRemoteStreamAudioEnabled(call_id);
	}

    // add audio stream to the page
    document.getElementById("myBody").insertBefore(audio, document.getElementById("myDiv"));
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
/************************* LISTENING TO ROOMS ************************/

function listenToRoom() {

	// detach any old listeners
	classRoomsDatabase.child(currRoomID).off();

	// attach listener to the current room
	classRoomsDatabase.child(currRoomID).on("value", function(snapshot) {

        var snapshotValueObject = snapshot.val();

        if (snapshotValueObject) {
        	// get the updated list of users in the room
        	var updatedRoomUsers = Object.values(snapshotValueObject);

        	// TODO: update UI with updated users list

        	// set our currRoomUsers to the updated list
        	currRoomUsers = updatedRoomUsers;
        }

    });
}

/*********************************************************************/
/********************** MUTING / UNMUTING AUDIO **********************/

// - toggle my own audio
function toggleMyStreamAudioEnabled() {
	console.log("toggling my audio to " + !(myStream.getAudioTracks()[0].enabled));
	myStream.getAudioTracks()[0].enabled = !(myStream.getAudioTracks()[0].enabled);
}

function setMyStreamAudioEnabled(enabled) {
	
	if (myStream) {
		console.log("setting my audio to " + enabled);
		myStream.getAudioTracks()[0].enabled = enabled;
	}
}

// - toggle audio from another person
function toggleRemoteStreamAudioEnabled(call_id) {
	console.log("toggling remote audio to " + !(myRemoteStreams[call_id].muted));
	myRemoteStreams[call_id].muted = !(myRemoteStreams[call_id].muted);
}
/*********************************************************************/
/******************************* MISC ********************************/

// when the window is about to close
window.onbeforeunload = function(event) {
	// send request to server to tell them we left
	leaveRoomHard();
};

// makes sure we leave the room
function leaveRoomHard() {
	if (currRoomID != null) {
		var xhr = new XMLHttpRequest();
		xhr.open('GET', "/leave_room/" + currRoomID, false);
		xhr.send();
	}
}
/*********************************************************************/
