/***** Firebase setup *****************************/
var config = {
  apiKey: "AIzaSyB8eBxo5mqiVVskav5dCUQ1Hr_UQeiJAL4",
  authDomain: "studyspace-490cd.firebaseapp.com",
  databaseURL: "https://studyspace-490cd.firebaseio.com",
  storageBucket: "studyspace-490cd.appspot.com",
  messagingSenderId: "293916419475"
};
firebase.initializeApp(config);
var databaseRef = firebase.database().ref(); //root
var classRoomsDatabase = databaseRef.child("ClassRooms");
var roomsDatabase = databaseRef.child("RoomInfo");
var botDatabase = databaseRef.child("Bots");
/**************************************************/
