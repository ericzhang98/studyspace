myApp.controller("AddClassController", function($scope, $rootScope, $http) {

  /******************ADD CLASS MODAL************************************/

  // Listener that allows other controllers to call refreshAddClass
  $scope.$on('refreshAddClass', function(event, data) {
    refreshAddClass();
  });

  var allClassesNameToID = null;
  var temp_class_ids = []; // class id's that are going to be displayed
  //TODO: ERIC -- change temp_class_ids as $scope model for clealiness?

  function refreshAddClass() {
    //deep copy so we won't copy over temp changes, also has an extra lounge_id


    temp_class_ids = $rootScope.my_class_ids.slice();
    temp_class_ids.splice(temp_class_ids.indexOf('lounge_id'), 1);

    //console.log('LUL ' + $rootScope.my_class_ids);
    //console.log('LUL ' + temp_class_ids);

    //grab all classes if they weren't pulled before
    if (allClassesNameToID == null) {
      getAllClasses();
    }
    else {
      displayClasses();
    }
  }

  // updates UI to display currently enrolled classes
  function displayClasses() {
    $scope.tempClasses = [];
    for (var i = 0; i < temp_class_ids.length; i++) {
      if (temp_class_ids[i] != "lounge_id") {
        $scope.tempClasses.push({
          class_id: temp_class_ids[i],
          class_name: getNameOfClass(temp_class_ids[i])
        });
      }
    }
    $rootScope.safeApply($scope);
  }

  /* Add, remove, and save */
  //process input to see if the class should be added
  $scope.processSelection = function processSelection() {
    //console.log($scope.selectedItem);
    //don't trigger on null (when the selected item changes from a good one)
    if ($scope.selectedItem) {
      var class_name = $scope.selectedItem;
      if (verifyClass(class_name)) {
        var class_id = allClassesNameToID[class_name];
        // Make sure the user isn't already in the class.
        if($.inArray(class_id, temp_class_ids) == -1) {
            addClass(class_id);
        } else {
          //TODO: UI for already in class
          //console.log("already in class with name " + class_name+ " and id " + class_id);
        }
      }
      else {
        //TODO: UI for class doesn't exist
        //console.log("could not verify class with name " + class_name + " and id " + class_id);
      }
    }
  }

  function verifyClass(className) {
    var returnVal = $.inArray(className, 
        Object.keys(allClassesNameToID).map(function(x){return x;}));
    return returnVal > -1;
  }

  function addClass(class_id) {
    //console.log("UI Adding " + class_id);
    temp_class_ids.push(class_id);
    displayClasses();
    $scope.searchText = "";
  }

  $scope.removeClass = function(class_id) {
    //console.log("UI Removing " + class_id);
    var index = $.inArray(class_id, temp_class_ids);
    if(index == -1) {
      //console.log("Cannot remove class, class_id" + class_id+ " not found!")
    }
    temp_class_ids.splice(index, 1);
    displayClasses();
  }

  $scope.saveChanges = function() {
    $http.post('/enroll', {class_ids: temp_class_ids});
    closeModal("#modal-add-class", "#add-class");

    //ISAAC -- call function(temp_class_ids)
    updateLocalClasses(temp_class_ids);
  }

  function updateLocalClasses(updated_class_ids) {
    //console.log("UPDATING LOCAL CLASSES")
    updated_class_ids = updated_class_ids.concat(['lounge_id']);
    //console.log('LUL2 ' + $rootScope.my_class_ids);
    //console.log('LUL2 ' + updated_class_ids);
    var noChange = true;
    updated_class_ids.forEach(function(class_id) {
      // for classes I've added
      if ($rootScope.my_class_ids.indexOf(class_id) == -1) {
        $rootScope.getClassBC(class_id);
        noChange = false;
      }
    });

    noChange = noChange && $rootScope.my_class_ids.length == updated_class_ids.length; 

    $rootScope.my_class_ids = updated_class_ids;
    $rootScope.safeApply($scope);

    if (!noChange) {
      //console.log('was changed');
      showAlert("course-change-alert", 'normal', false);
    }
  }

  // populates the allClassesNameToID dictionary with all available classes
  function getAllClasses() {
    allClassesNameToID = {};
    var xhr = new XMLHttpRequest();
    xhr.open('GET', "/get_all_classes", true); // responds with class_ids
    xhr.send();

    // once we have the user's classes
    xhr.onreadystatechange = function(e) {
      if (xhr.readyState == 4 && xhr.status == 200) {
        var response = JSON.parse(xhr.responseText);

        // populate the classes dictionary
        for (var i = 0; i < response.length; i++) {
          var classObj = response[i];
          if (classObj.class_id != "lounge_id") {
            allClassesNameToID[classObj.name] = classObj.class_id;
          }
        }
      }
      displayClasses();
    }
  }

  /* Helper functions */
  $scope.querySearch = function querySearch (query) {
    return query ? Object.keys(allClassesNameToID).filter(createFilterFor(query)) : [];
  }
  // filter function for search query to make it case-insensitive
  function createFilterFor(query) {
    return function filterFn(thisClass) {
        var uppercaseQuery = query.toUpperCase();
        pass = (thisClass.toUpperCase().indexOf(uppercaseQuery) === 0);
        thisClass = thisClass.replace(/\s+/g, '');
        pass = pass || (thisClass.toUpperCase().indexOf(uppercaseQuery) === 0);
        return pass;
    };
  }

  // returns name of class given class_id
  function getNameOfClass(class_id) {
    for (var name in allClassesNameToID) {
      if (allClassesNameToID[name] == class_id) {
        return name;
      }
    }
  }
});