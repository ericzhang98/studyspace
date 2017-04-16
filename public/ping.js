
var currPing = null;
var USER_PING_PERIOD = 10*1000;
//setup activity ping
//the client can mess around with this, we need to handle kicking the
//client somehow if they stop pinging, it's fine if they can still
//listen in on data, but other users must always be aware of prescence
pingUserActivity(true);

function pingUserActivity(constant) {
	var xhr = new XMLHttpRequest();
	xhr.open("GET", "/ping", true);
	xhr.onerror = function(){
	  //console.log(xhr.status);
	  showAlert("no-connection-alert", "longaf", false);
	}
	xhr.send();
	//console.log("pinging"); 
	if (constant) {
	  currPing = setTimeout(pingUserActivity, USER_PING_PERIOD, true);
	}
}