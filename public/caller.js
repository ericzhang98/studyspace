function Caller(my_id) {

  var thisCaller = this;

  const PEER_PING_PERIOD = 30000;
  /***** General variables **************************/
  //var me = {user_id: "id2", block_list: ["block1"]};
  var myID = my_id;
  var isLecturer = false;   // am I giving a lecture?
  this.currRoomCallID = null;
  /**************************************************/

  /***** Audio conferencing variables ***************/
  var myPeer = new Peer(myID, 
    {host: "pacific-lake-64902.herokuapp.com", port: "",  path: '/peerjs'});
  myPeer._lastServerId = myID;
  var myStream = null;
  var myCalls = {};         // Dictionary from user_id to call
  var myRemoteStreams = {}; // Dictionary from user.id to audio track
  this.showVideo = false;    // Was I previously showing video?
  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

  /*********************** CALLING AND ANSWERING ***********************/

  // Grab user media (voice)
  function getMedia(callback) {
    navigator.getUserMedia({video: true, audio: true}, function(stream) {
      myStream = stream;
      myStream.getVideoTracks()[0].enabled = false;
      addRemoteStream(myStream, myID);
      angular.element(document.getElementById('myBody')).scope().setVolumeListener(myID, myStream);
      showAlert("media-connect-alert", 'short');
      if (callback) {
        callback();
      }
    }, function(err) {
      //console.log('Failed to get local stream', err);
    });
  }

  /******************************* MISC ********************************/

  // makes sure we leave the room
  this.leaveRoomCallHard = function() {
    //console.log(this.currRoomCallID);
    if (this.currRoomCallID != null) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', "/leave_room/" + this.currRoomCallID, false);
      xhr.send();
    }
  }

  function setOnBeforeUnload() {
    // when the window is about to close
    window.onbeforeunload = function(event) {
      // send request to server to tell them we left
      thisCaller.leaveRoomCallHard();
      //leaveRoomCall(this.currRoomCallID);
    };
  }
  /*********************************************************************/

  // Grab user media immediately
  getMedia();

  // Respond to open
  myPeer.on('open', function() {
    setTimeout(pingPeerServer, 5000, true);
  });

  // Respond to call
  myPeer.on('call', function(call) {

    // If the user isn't blocked, answer the call
    //if (me.block_list.indexOf(call.peer) == -1) {
    answerCall(call);
    //}

  });

  myPeer.on("disconnected", function() {
    //console.log("DISCONNECTED");
  });

  myPeer.on("error", function(err) {
    //console.log(err);
  });

  //pings peer server, pass in true for constant 30 sec ping
  function pingPeerServer(constant) {
    myPeer.socket.send({type:"Ping"});
    if (constant) {
      setTimeout(pingPeerServer, PEER_PING_PERIOD, true);
    }
  }

  // - ensures myStream is set, delegates to startCallHelper()
  function startCall(other_user_id) {
    //console.log("calling " + other_user_id);

    // do not send out calls to users that we've blocked
    /*if (me.block_list.indexOf(other_user_id) != -1) {
      return;
    }*/

    // myStream already set
    if (myStream != null) {
      //console.log("myStream already set");
      startCallHelper(other_user_id);
    }   

    // myStream not yet set
    else {
      //console.log("myStream not yet set");
      getMedia(startCallHelper(other_user_id));
    }
  }

  // - with myStream set, starts the call
  function startCallHelper(other_user_id) {

    var call = myPeer.call(other_user_id, myStream);
    
    if (call) {
      //console.log("sent call to user with id: " + call.peer)

        // reference to the call so we can close it
        myCalls[other_user_id] = (call);

      //console.log("outgoing stream id: " + myStream.id)

        call.on('stream', function(remoteStream) {
          //console.log("incoming stream id: " + remoteStream.id)

          establishCall(remoteStream, call.peer);
        });

      call.on('close', function() {
        //console.log("call closed");
        destablishCall(call.peer);
      });
    }
    else {
      //console.log("You have two windows open, call should already be set in one");
    }

  }

  // - ensures myStream is set, delegates to answerCallHelper()
  function answerCall(call) {
    //console.log("received call from user with id: " + call.peer)

    // myStream already set
    if (myStream != null) {
      //console.log("myStream already set");
      answerCallHelper(call);
    } 

    // myStream not yet set
    else {
      //console.log("myStream not yet set");
      getMedia(answerCallHelper(call));
    }
  }

  // - with myStream set, answers the call
  function answerCallHelper(call) {

    // Answer the call with an A/V stream
    call.answer(myStream); 

    // reference to the call so we can close it
    myCalls[call.peer] = (call);

    //console.log("outgoing stream id: " + myStream.id)
    call.on('stream', function(remoteStream) {
      //console.log("incoming stream id: " + remoteStream.id) 
      establishCall(remoteStream, call.peer);
    });

    call.on('close', function() {
      //console.log("call closed");
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
  this.joinRoomCall = function(room_id) {

    this.leaveRoomCall();

    //console.log("joining room call with id " + this.currRoomCallID);

    // send request to server
    var xhr = new XMLHttpRequest();
    xhr.open('GET', "/join_room/" + room_id, true);
    xhr.send();

    // on response
    xhr.onreadystatechange = function(e) {
      if (xhr.readyState == 4 && xhr.status == 200) {

        var response = JSON.parse(xhr.responseText);

        // room no longer exists
        //console.log(response);
        if (response.room_id == null) {
          //console.log("room does not exist");
          return;
        }

        thisCaller.currRoomCallID = room_id;

        // set the onload function to use the new room id
        setOnBeforeUnload();

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
            //console.log("GIVE MIC PERMISSIONS PLZ");
            showAlert("no-permissions-alert", 'normal', false);
          }

          // by default, unmute me
          //setMyStreamAudioEnabled(true);

          // call everyone
          var usersArray = Object.values(response.users);

          for (i = 0; i < usersArray.length; i++) {

            var other_user_id = usersArray[i];
            //console.log("assessing " + other_user_id);

            if (other_user_id != myID) {
              startCall(other_user_id);
            }
          }
        }
      }
    }
  }

  // - updates server and leaves all current calls
  this.leaveRoomCall = function() {

    // are we even in a room?
    if (this.currRoomCallID != null) {
      //console.log("leaving room with id " + this.currRoomCallID);
      // leave our calls
      leaveCalls();

      //angular.element(document.getElementById('myBody')).scope().userStreamSources = {};

      // send request to server to tell them we left
      var xhr = new XMLHttpRequest();
      xhr.open('GET', "/leave_room/" + this.currRoomCallID, true);
      xhr.send();

      this.currRoomCallID = null;

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
    angular.element(document.getElementById('video-layer')).scope().userStreamSources[user_id] = window.URL.createObjectURL(remoteStream);
    angular.element(document.getElementById('video-layer')).scope().$apply();

    // if I am the lecturer, I want everyone else muted by default
    if (isLecturer) {
      this.toggleRemoteStreamAudioEnabled(user_id);
    }


    // add audio stream to the page
    //document.getElementById("myBody").insertBefore(audio, document.getElementById("myDiv"));
    /*container = document.createElement('div');
    container.className = "video-container";
    container.id = user_id + "-video-container";
    if (this.videoContainers.length == 0) {
      document.getElementById("video-row").appendChild(container);
    } 
    else {
      document.getElementById("video-row").insertBefore(container, this.videoContainers[this.videoContainers.length - 1].nextSibling);
    }
    this.videoContainers.push(container);
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
      delete angular.element(document.getElementById('video-layer')).scope().userStreamSources[user_id];

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
  this.toggleMyStreamAudioEnabled = function() {
    ////console.log("toggling my audio to " + !(myStream.getAudioTracks()[0].enabled));
    myStream.getAudioTracks()[0].enabled = !(myStream.getAudioTracks()[0].enabled);
  }

  // - set my audio
  function setMyStreamAudioEnabled(enabled) {
    if (myStream) {
      ////console.log("setting my audio to " + enabled);
      myStream.getAudioTracks()[0].enabled = enabled;
    }
  }

  // - set my video
  // - enabled: should my video stream be enabled?
  // - direct: is my video stream being toggled explicitly or implicitly?
  this.setMyStreamVideoEnabled = function(enabled, direct = true) {

    // if I have a stream
    if (myStream) {
      // enable / disable my stream
      myStream.getVideoTracks()[0].enabled = enabled;

      // if explicitly called, update showVideo
      if (direct) {
        this.showVideo = enabled;
      }

      if (enabled) {
        showAlert('video-alert', 'long');
      }
    }
  }

  // - toggle audio from another person
  this.toggleRemoteStreamAudioEnabled = function(user_id) {
    //if (myRemoteStreams[user_id] != null) {
      ////console.log("toggling remote audio to " + !(myRemoteStreams[user_id].muted));
      //myRemoteStreams[user_id].muted = !(myRemoteStreams[user_id].muted);
      if (document.getElementById(user_id + "_video")) {
        document.getElementById(user_id + "_video").muted = !document.getElementById(user_id + "_video").muted;
      }
      //myRemoteStreams[user_id].muted = !(myRemoteStreams[user_id].muted);
    //}
  }

  this.getVideoEnabled = function() {
    return myStream && myStream.getVideoTracks()[0].enabled;
  }
  /*********************************************************************/

}
