var ConstantManager = function() {

	// - Firebase admin setup
	var firebaseAdmin = require("firebase-admin");
	var serviceAccount = require("./dontlookhere/porn/topsecret.json"); //shhhh
	var firebase = firebaseAdmin.initializeApp({
	  credential: firebaseAdmin.credential.cert(serviceAccount),
	  databaseURL: "https://studyspace-490cd.firebaseio.com/"
	});
	var firebaseRoot = firebase.database().ref();

	// - Firebase Databases
	this.classRoomsDatabase = firebaseRoot.child("ClassRooms");
	this.roomInfoDatabase = firebaseRoot.child("RoomInfo");
	this.roomMessagesDatabase = firebaseRoot.child("RoomMessages");
	this.roomPinnedMessagesDatabase = firebaseRoot.child("RoomPinnedMessages");
	this.userActivityDatabase = firebaseRoot.child("UserActivity");
	this.classDLDatabase = firebaseRoot.child("ClassDownLists");
	this.roomTypingDatabase = firebaseRoot.child("RoomTyping");
}

module.exports = ConstantManager;
