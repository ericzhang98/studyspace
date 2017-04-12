myApp.controller("CreateRoomController", function($scope, $rootScope, $http) {

  // Reads input from create-room-modal, creates room, and joins room
  $scope.createRoom = function() {

    // Grab modal values
    var class_id = creationClassID;

    // style choice: all room names be lower case only
    var room_name = (document.getElementById('room_name').value).toLowerCase();
    var is_lecture = document.getElementById('lecture-checkbox').checked;
    var time_created = Date.now();

    // if class_id is null do nothing
    if (class_id == null) {
      //console.log("no class selected");
      // TODO: error message
      return;
    }

    // if room_name is empty do nothing
    if (room_name.length == 0) {
      //console.log("room name must be between 1 and 28 characters");
      // TODO: error message
      return;
    }

    // Close the modal
    closeModal("#modal-create-room", "#create-room");

    // Send out addRoom request
    //console.log("adding room with class_id: " + class_id + ", room_name: " + room_name);
    var xhr = new XMLHttpRequest();
    xhr.open('GET', "/add_room/" + class_id + "/" + 
             room_name + "/" + is_lecture + "/" + time_created + "/" + $scope.myName, true);
    xhr.send();

    // Once room has been created
    xhr.onreadystatechange = function(e) {
      // room has been created
      if (xhr.readyState == 4 && xhr.status == 200) {
        var response = JSON.parse(xhr.responseText);

        if (response.error) {
          //console.log(response.error);
          return;
        }

        if (response.room_id) {

          // join the room
          $scope.joinRoom(response.room_id, response.class_id);
        }
      }
    }
  }
})