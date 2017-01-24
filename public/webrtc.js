var me = {user_id: "id2"}

var peer = new Peer(me.user_id, {key: 'tirppc8o5c9xusor'});
var myCalls = [];
var myStream = null;

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

console.log("Hello peer.js");

function call_button_on_click() {
	startCall(document.getElementById("target_id_input").value);
}

function hang_up_button_on_click() {
	leaveCalls();
}

function join_room_button_on_click() {
	joinRoom("ucsd_cse_110_1");
}

function leave_room_button_on_click() {
	leaveRoom("ucsd_cse_110_1");
}


// Respond to open
peer.on('open', function(id) {
	console.log('My peer ID is: ' + id);
});

// Respond to call
peer.on('call', function(call) {
	answerCall(call);
});


// - ensures myStream is set, delegates to
//   startCallHelper()
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

		var audio = document.querySelector('audio'); 

	    //inserting our stream to the video tag     
	    audio.src = window.URL.createObjectURL(remoteStream); 
	});

	call.on('close', function() {
		console.log("call closed");
	});
}

// - ensures myStream is set, delegates to
//   answerCallHelper()
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

 		// Show stream in some video/canvas element.
 		console.log("received stream with id " + remoteStream.id)	
		
		var audio = document.querySelector('audio'); 
	
	    //inserting our stream to the video tag     
	    audio.src = window.URL.createObjectURL(remoteStream); 
	});

	call.on('close', function() {
		console.log("call closed");
	});
}

// - closes all calls and empties myCalls
function leaveCalls() {
	for (i = 0; i < myCalls.length; i++) {
		myCalls[i].close();
	}

	myCalls = [];
}

function joinRoom(room_id) {
	console.log("joining room with id " + room_id);

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

function leaveRoom(room_id) {
	console.log("joining room with id " + room_id);

	// send request to server
	var xhr = new XMLHttpRequest();
	xhr.open('GET', "/leave_room/" + room_id + "/" + me.user_id, true);

	xhr.send();

	leaveCalls();
}

