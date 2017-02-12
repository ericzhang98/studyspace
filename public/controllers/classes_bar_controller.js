//***** General variables **************************/
var me = {user_id: "id1"};
var class_rooms = {} 	// class_id : class rooms
var class_names = {} 	// class_id : class name
var rooms = {}			// room_id : room
/**************************************************/
// classes sidebar app
var myApp = angular.module("classesApp", []);

myApp.controller("classesController", function($scope) {

  /*myScope = $scope;
  $scope.classes = {
    123:"CSE110",
    345:"CSE140",
    6543:"CSE131",
    876:"PSY 2B"
  };*/

  getClasses();


  function setClasses( classNamesList ) {
    console.log("Setting classes");
    $scope.classes = classNamesList; 
  }

  // - gets all class_ids for user
  // - delegates to getClass
  function getClasses() {
    console.log("Getting classes...")
    var xhr = new XMLHttpRequest();
    xhr.open('GET', "/get_classes/" + me.user_id, true); // responds with class_ids
    xhr.send();

    xhr.onreadystatechange = function(e) {
      if (xhr.readyState == 4 && xhr.status == 200) {
        var response = JSON.parse(xhr.responseText);
        console.log(response.class_ids);
        for (i = 0; i < response.class_ids.length; i++) {
          getClass(response.class_ids[i]);
        }
      }
    }
  }

  // - gets class_name and class_rooms for specified class
  // - adds the class to the UI
  // - calls getRoom on all the rooms for specified class
  function getClass(class_id) {
    console.log("Getting class with id " + class_id);

    // add listener for class rooms
    classRoomsDatabase.child(class_id).on("value", function(snapshot) {

      var class_rooms = snapshot.val();

      if (class_rooms) {
        onClassRoomsChange(class_id, Object.values(class_rooms));
      }

    });

    // get class name
    var xhr = new XMLHttpRequest();
    xhr.open('GET', "/get_class/" + class_id, true); // responds with the class's name and room_ids
    xhr.send();

    xhr.onreadystatechange = function(e) {
      if (xhr.readyState == 4 && xhr.status == 200) {

        // store the class
        var response = JSON.parse(xhr.responseText);
        class_names[class_id] = response.name;

        console.log("class name is: " + response.name);

        // TODO: update UI to add the class
        $scope.classes.push(class_names);
      }
    }
  }

});


