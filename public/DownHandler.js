function DownHandler(onDownThreshold) {
	this.downLists = {}			// class_id : user_ids

	this.joinDownList = function(class_id) {
		var xhr = new XMLHttpRequest();
    xhr.open('GET', "/join_down_list/" + class_id, true);
    xhr.send();
	}

	function pullAllDownLists(class_ids) {
		for (i = 0; i < class_ids.length; i++) {
			pullDownList(class_ids[i]);
		}
	}

	function pullDownList(class_id) {
		classDLDatabase.child(class_id).on("value", function(snapshot) {

      var downList = snapshot.val();

      console.log("DownList: " + downList);
    });
	}
}

/*
Users can see how many people are in a given DownList
Users can join a DownList. You can indicate what you're looking to study for.
After a period of being on the DownList, you may be put into a room with others who are down.
*/