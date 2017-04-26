function DownHandler(myID, onDownChange, onDownThreshold) {

	this.downLists = {}			// class_id : user_ids

	var socket = io();
	var thisDH = this;

	// - Toggles my position in a class's down list (default sets to true)
	this.toggleDownList = function(class_id) {
		logger.msg("toggling down list for " + class_id);

		var xhr = new XMLHttpRequest();
    xhr.open('GET', "/toggle_down_list/" + class_id, true);
    xhr.send();

    xhr.onreadystatechange = function(e) {
      if (xhr.readyState == 4 && xhr.status == 200) {
      	var response = JSON.parse(xhr.responseText);
      	if (response.isDown) {
    			// if I'm down for a class, add a listener to the socket
    			addSocketListener(class_id);
      	}
  			else {
  				// if I'm not, make sure I'm no longer listening for it
  				socket.off(class_id + '_down_list');
  			}
      }
    }
	}

	// - Sets up socket listener for a specific class
	function addSocketListener(class_id) {

		logger.msg("listening on " + class_id + '_down_list');

  	socket.on(class_id + '_down_list', function(data) {

  		// onDownThreshold function = joining a room.
  		onDownThreshold({room_id : data.room_id, class_id : class_id});

  		// stop listening to this class
  		socket.off(class_id + '_down_list');
  	})
	}

	// - Sets up listener for a class's down list
	this.pullDownList = function(class_id) {

		classDLDatabase.child(class_id).child("userIDs").on("value", function(DLSnapshot) {

			logger.msg("pulling down list for " + class_id);

			// reset the down list
			thisDH.downLists[class_id] = [];

			// repopulate the down list
      if (DLSnapshot) {
      	DLSnapshot.forEach(function(entry) {
      		if (entry.val()) {
      			thisDH.downLists[class_id].push(entry.key);
      		}
      	})
    	}

    	onDownChange();
    });
	}
}

/*
	Users can see how many people are in a given DownList
	Users can join a DownList. You can indicate what you're looking to study for.
	After a period of being on the DownList, you may be put into a room with others who are down.
*/