var singletonClassDLManager = function(cm, io, addRoom) {

	const MONITOR_PERIOD = 3000;		// the length of time between a class's DL check
	const ND_FACTOR = 3000;					// how much shorter a group should have to wait per person past the first two
	const BASE_WAIT = 12000;				// how long two people would have to wait before being paired
																	// 2 min for two, 1.5 min for three, 1 min for 4
																	// greatest additional wait (after second person joins) = 2 + 1.5 + 1 = 4.5 min
	var thisDLM = this;

  // - toggles a user's down status in a class
  this.toggleUserDL = function(user_id, class_id, callback) {
    cm.classDLDatabase.child(class_id).child("userIDs").child(user_id).once("value", function(snapshot) {
      var isDown = snapshot ? !snapshot.val() : true;
      cm.classDLDatabase.child(class_id).child("userIDs").child(user_id).set(isDown ? true : null);
      cm.classDLDatabase.child(class_id).child("lastJoinTime").set(Date.now());
      callback(isDown);
    });
  }

  // - sets up a recursive monitor of a class
  // - responsible for opening DL rooms
  this.monitorClassDL = function(class_id) {
  	cm.classDLDatabase.child(class_id).once("value", function(snapshot) {
  		if (snapshot) {
	  		var numDown = snapshot.child("userIDs").val() ? snapshot.child("userIDs").numChildren() : 0;
	  		var lastJoinTime = snapshot.child("lastJoinTime").val() ? snapshot.child("lastJoinTime").val() : -1;
	  		console.log("numDown: " + numDown);
	  		console.log("lastJoinTime: " + lastJoinTime);

	  		attemptOpenDL(lastJoinTime, numDown, class_id);
  		}
  		setTimeout(function() {thisDLM.monitorClassDL(class_id)}, MONITOR_PERIOD);
  	});
  }

  // - calculates whether a DL room should be opened and calls openDLRoom if so
  // - returns boolean representing whether a room was created or not
  function attemptOpenDL(lastJoinTime, numDown, class_id) {

  	if (numDown > 1 && (numDown > 5 || Date.now() - lastJoinTime + (numDown - 2) * ND_FACTOR >= BASE_WAIT)) {
  		openDLRoom(class_id);
  		return true;
  	}

  	return false;
  }

  // - opens a room for a class's down list and emits message that a room has been created
	function openDLRoom(class_id) {
		addRoom(class_id, DLRoomName(class_id), "no_host", false, Date.now(), "no_host", 
			function(err, newRoom) {
				io.emit(class_id + "_down_list", {room_id: newRoom.room_id});
				cm.classDLDatabase.child(class_id).child("userIDs").set(null);
				cm.classDLDatabase.child(class_id).child("numChecks").set(0);
			}
		)
	}

	// - creates a room name for a down list room
	function DLRoomName(class_id) {
		return class_id + " Study Room";
	}

}

module.exports = singletonClassDLManager;