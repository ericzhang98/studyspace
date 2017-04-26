function Logger(DEBUG) {
	
	this.msg = function(msg) { 
		if (DEBUG) {
			console.log(msg);
		}
	}
}