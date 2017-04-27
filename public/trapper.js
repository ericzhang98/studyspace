function trapper() {

  this.apply = null;


  var thisTrapper = this;
  var currRoomChatID = null;
  var songDatabase = null;
  var player = document.getElementById("iframePlayer");



  this.joinParty = function(currRoomChatID) {
    if (songDatabase != null) {
      songDatabase.off();
    }
    if (currRoomChatID) {
      songDatabase = databaseRef.child("RoomSong").child(currRoomChatID);
      songDatabase.on("value", function(snapshot) {
        var val = snapshot.val();
        if (val) {
          playSong(val.url);
          thisTrapper.currSongTitle = val.title;
          thisTrapper.apply();
        }
        else {
          player.src = "";
          thisTrapper.currSongTitle = null;
          thisTrapper.apply();
        }
      });
    }
    else {
      player.src = "";
    }
  }

}
