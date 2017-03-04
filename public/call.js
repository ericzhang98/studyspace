/***** General variables **************************/
var me = {user_id: "id2", block_list: ["block1"]};
var currRoomUsers = [];
var isLecturer = false;		// am I giving a lecture?
/**************************************************/

/***** Audio conferencing variables ***************/
//var peer = new Peer(myID, {host: "localhost", port: "9000", path: '/peerjs'});
var peer = new Peer(myID, 
  {host: "pacific-lake-64902.herokuapp.com", port: "",  path: '/peerjs'});
//var peer = new Peer(myID,
//  {host: "studyspacepeerserver.mybluemix.net", port: "", path: "/peerjs"});
peer._lastServerId = myID;
var PEER_PING_PERIOD = 30000;
var myStream = null;
var myCalls = {};         // Dictionary from user_id to call
var myRemoteStreams = {}; // Dictionary from user.id to audio track
var videoContainers = []
var showVideo;
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

// Grab user media immediately
getMedia();

/*********************** CALLING AND ANSWERING ***********************/

// Grab user media (voice)
function getMedia(callback) {
  navigator.getUserMedia({video: true, audio: true}, function(stream) {
    myStream = stream;
    setMyStreamVideoEnabled(false);
    addRemoteStream(myStream, myID);
    angular.element(document.getElementById('myBody')).scope().setVolumeListener(myID, myStream);
    showAlert("media-connect-alert", 'short');
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
    getMedia(startCallHelper(other_user_id));
  }
}

// - with myStream set, starts the call
function startCallHelper(other_user_id) {

  var call = peer.call(other_user_id, myStream);

  console.log("sent call to user with id: " + call.peer)

  // reference to the call so we can close it
  myCalls[other_user_id] = (call);

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
    getMedia(answerCallHelper(call));
  }
}

// - with myStream set, answers the call
function answerCallHelper(call) {

  // Answer the call with an A/V stream
  call.answer(myStream); 

  // reference to the call so we can close it
  myCalls[call.peer] = (call);

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

  // set up the listener for this peer
  angular.element(document.getElementById('myBody')).scope().setVolumeListener(peer_id, remoteStream);

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
        showAlert("lecture-alert");
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

        //show alert if no audio permissions
        if (myStream == null) {
          console.log("GIVE MIC PERMISSIONS PLZ");
          showAlert("no-permissions-alert", 'normal', false);
        }

        // by default, unmute me
        setMyStreamAudioEnabled(true);

        // call everyone
        var usersArray = Object.values(response.users);

        for (i = 0; i < usersArray.length; i++) {

          var other_user_id = usersArray[i];
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

    //angular.element(document.getElementById('myBody')).scope().userStreamSources = {};

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
  /*var media = document.createElement('video');

  media.autoplay = true;

  // set the source
  media.src = window.URL.createObjectURL(remoteStream); */

  // store the element in myRemoteStreams
  //myRemoteStreams[user_id] = media;
  angular.element(document.getElementById('myBody')).scope().userStreamSources[user_id] = window.URL.createObjectURL(remoteStream);
  angular.element(document.getElementById('myBody')).scope().$apply();

  // if I am the lecturer, I want everyone else muted by default
  if (isLecturer) {
    toggleRemoteStreamAudioEnabled(user_id);
  }


  // add audio stream to the page
  //document.getElementById("myBody").insertBefore(audio, document.getElementById("myDiv"));
  /*container = document.createElement('div');
  container.className = "video-container";
  container.id = user_id + "-video-container";
  if (videoContainers.length == 0) {
    document.getElementById("video-row").appendChild(container);
  } 
  else {
    document.getElementById("video-row").insertBefore(container, videoContainers[videoContainers.length - 1].nextSibling);
  }
  videoContainers.push(container);
  container.append(media);*/
  //var name = document.createTextNode(angular.element(document.getElementById('myBody')).scope().users[user_id].name);
  //container.append(name);
}

// - removes the audio track that streaming the remoteStream from call_id
function removeRemoteStream(user_id) {

  // remove the audio track from the page
  //if (myRemoteStreams[user_id]) {
    //document.getElementById("video-layer").removeChild(myRemoteStreams[user_id]);
    //document.getElementById("video-row").removeChild(document.getElementById(user_id + "-video-container"));

    // remove the remoteStream from myRemoteStreams
    //delete myRemoteStreams[user_id];
    delete angular.element(document.getElementById('myBody')).scope().userStreamSources[user_id];

    // document.getElementById("video-row").removeChild(document.getElementById(user_id + "-video-container"));
  //}
}

// - removes all {user_id: call} pairs in myCalls and closes calls
// - removes all {call.id: audio} pairs myRemoteStreams and removes audio tracks
function leaveCalls() {
  for (user_id in myCalls) {
    myCalls[user_id].close();
  }
  myCalls = {};
}
/*********************************************************************/
/********************** MUTING / UNMUTING AUDIO **********************/

// - toggle my own audio
function toggleMyStreamAudioEnabled() {
  //console.log("toggling my audio to " + !(myStream.getAudioTracks()[0].enabled));
  myStream.getAudioTracks()[0].enabled = !(myStream.getAudioTracks()[0].enabled);
}

// - toggle my video
/*function toggleMyStreamVideoEnabled() {
  setMyStreamVideoEnabled(!(myStream.getVideoTracks()[0].enabled));
}*/

// - set my audio
function setMyStreamAudioEnabled(enabled) {
  if (myStream) {
    //console.log("setting my audio to " + enabled);
    myStream.getAudioTracks()[0].enabled = enabled;
  }
}

// - set my video
function setMyStreamVideoEnabled(enabled, direct = true) {
  if (myStream) {
    myStream.getVideoTracks()[0].enabled = enabled;
    if (direct) {
      showVideo = enabled;
    }
    if (enabled) {
      showAlert('video-alert', 'long');
    }
  }
}

// - toggle audio from another person
function toggleRemoteStreamAudioEnabled(user_id) {
  //if (myRemoteStreams[user_id] != null) {
    //console.log("toggling remote audio to " + !(myRemoteStreams[user_id].muted));
    //myRemoteStreams[user_id].muted = !(myRemoteStreams[user_id].muted);
    document.getElementById(user_id + "_video").muted = !document.getElementById(user_id + "_video").muted;
    //myRemoteStreams[user_id].muted = !(myRemoteStreams[user_id].muted);
  //}
}
/*********************************************************************/
/******************************* MISC ********************************/

function setOnBeforeUnload(currRoomCallID) {
  // when the window is about to close
  window.onbeforeunload = function(event) {
    // send request to server to tell them we left
    leaveRoomHard(currRoomCallID);
    //leaveRoom(currRoomCallID);
  };
}

// makes sure we leave the room
function leaveRoomHard(currRoomCallID) {
  console.log(currRoomCallID);
  if (currRoomCallID != null) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', "/leave_room/" + currRoomCallID, false);
    xhr.send();
  }
}
/*********************************************************************/
