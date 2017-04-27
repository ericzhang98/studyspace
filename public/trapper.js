function trapper() {

  this.currRoomChatID = null;

  if (songDatabase != null) {
    songDatabase.off();
  }
  if (room_id) {
    songDatabase = databaseRef.child("RoomSong").child(room_id);
    songDatabase.on("value", function(snapshot) {
      var val = snapshot.val();
      if (val) {
        playSong(val.url);
        $scope.currSongTitle = val.title;
        $rootScope.safeApply($scope);
      }
      else {
        var player = document.getElementById("iframePlayer");
        player.src = "";
        $scope.currSongTitle = null;
        $rootScope.safeApply($scope);
      }
    });
  }
  else {
    var player = document.getElementById("iframePlayer");
    player.src = "";
  }
}
