var singletonClassDLManager = function(cm, io, addRoom) {

	const MONITOR_PERIOD = 3000;		// length of period at which a server checks a class's DL
	const ND_FACTOR = 3000;					// how much shorter a group should have to wait per person past the first two
	const BASE_WAIT = 12000;				// how long two people would have to wait before being paired
	const GROUP_THRESH = 5;					// if this many people are down to study, instantly make a room

	var thisDLM = this;

  // - toggles a user's down status in a class
  this.toggleUserDL = function(user_id, class_id, callback) {
    cm.classDLDatabase.child(class_id).child("userIDs").once("value", function(snapshot) {

    	// are we down?
      var isDown = snapshot.child(user_id) ? !snapshot.child(user_id).val() : true;

      // update the DL info on Firebase
      cm.classDLDatabase.child(class_id).child("userIDs").child(user_id).set(isDown ? true : null);
      cm.classDLDatabase.child(class_id).child("lastJoinTime").set(Date.now());

      // if we're down, see if we're ready to open a room
      if (isDown) {
      	attemptOpenDL(Date.now(), snapshot.numChildren() + 1, class_id);
    	}

      callback(isDown);
    });
  }

  // - sets up a recursive monitor of a class
  // - responsible for opening DL rooms
  // - possible error if two servers attemptOpenDL at the same time (extra room created)
  this.monitorClassDL = function(class_id) {
  	cm.classDLDatabase.child(class_id).once("value", function(snapshot) {
  		if (snapshot) {
  			var lastJoinTime = snapshot.child("lastJoinTime").val() ? snapshot.child("lastJoinTime").val() : -1;
	  		var numDown = snapshot.child("userIDs").val() ? snapshot.child("userIDs").numChildren() : 0;

	  		console.log("lastJoinTime: " + lastJoinTime);
	  		console.log("numDown: " + numDown);

	  		attemptOpenDL(lastJoinTime, numDown, class_id);
  		}
  		setTimeout(function() {thisDLM.monitorClassDL(class_id)}, MONITOR_PERIOD);
  	});
  }

  // - calculates whether a DL room should be opened and calls openDLRoom if so
  // - returns boolean representing whether a room was created or not
  function attemptOpenDL(lastJoinTime, numDown, class_id) {
  	console.log("attempting with\n" + lastJoinTime + "\n" + numDown);

  	if (numDown >= GROUP_THRESH || numDown > 1 && (Date.now() - lastJoinTime + (numDown - 2) * ND_FACTOR >= BASE_WAIT)) {
  		openDLRoom(class_id);
  		return true;
  	}

  	return false;
  }

  // - opens a room for a class's down list and emits message that a room has been created
  // - resets the DL info on Firebase
	function openDLRoom(class_id) {
		addRoom(class_id, DLRoomName(class_id), "no_host", false, Date.now(), "no_host", 
			function(err, newRoom) {
				io.emit(class_id + "_down_list", {room_id: newRoom.room_id});
				cm.classDLDatabase.child(class_id).child("userIDs").set(null);
				cm.classDLDatabase.child(class_id).child("lastJoinTime").set(null);
			}
		)
	}

	// - creates a room name for a down list room
	function DLRoomName(class_id) {
		return class_id + " Study Room";
	}

}

module.exports = singletonClassDLManager;