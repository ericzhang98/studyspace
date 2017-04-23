function DownHandler(onDownChange, onDownThreshold) {

	this.downLists = {}			// class_id : user_ids

	var thisDH = this;

	// - Toggles my position in a class's down list (default sets to true)
	this.toggleDownList = function(class_id) {
		logger.msg("toggling down list for " + class_id);

		var xhr = new XMLHttpRequest();
    xhr.open('GET', "/toggle_down_list/" + class_id, true);
    xhr.send();
	}

	// - Sets up listener for a class's down list
	this.pullDownList = function(class_id) {

		classDLDatabase.child(class_id).on("value", function(DLSnapshot) {

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