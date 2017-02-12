Object.values = Object.values || function(o){return Object.keys(o).map(function(k){return o[k]})}

angular
   .module('MyApp', ['ngMaterial'])
   .controller('updateController', autoCompleteController);

function autoCompleteController ($timeout, $q, $log, $http) {
    // Global Variables
    var userClasses = []; // list of class_ids of classes user is enrolled in
    var allClassesNameToID = {}; // name: class_id dictionary for all available classes

    // Send requests to populate the two fields above
    getAllClasses();

    // list of states to be displayed
    this.querySearch = querySearch;

    $("#cancel-button").click(cancelChanges)

    // If enter is pressed inside the dropdown
    $("#class-dropdown").keypress(function(event) {
        if(event.which == 13) {

            var className = $("#input-0").val();

            if (verifyClass(className)) {

                var class_id = allClassesNameToID[className];
                // Make sure the user isn't already in the class
                if($.inArray(class_id, userClasses) == -1) {
                    addClass(class_id);
                } else {
                    console.log("already in class with name " + className + " and id " + class_id);
                }
            }
            else {
                console.log("could not verify class with name " + className + " and id " + class_id);
            }
        }
    });

    $("#save-button").click(saveChanges);

    // adds classID to list of user's classes and updates the UI to reflect this
    function addClass(classID) {
        console.log("adding class with ID " + classID);
        userClasses.push(classID);
        displayClasses(userClasses);
    }

    // return to main
    function cancelChanges() {
        document.location.href = "/";
    }

    // filter function for search query
    function createFilterFor(query) {
        var uppercaseQuery = query.toUpperCase();
        return function filterFn(thisClass) {
            return (thisClass.toUpperCase().indexOf(uppercaseQuery) === 0);
        };
    }

    // updates UI to display currently enrolled classes
    function displayClasses() {
        userClasses.sort();
        var htmlString = '<div class="school-class">';
        userClasses.forEach(function(class_id, index) {
            htmlString += '<div class="school-class"><button class="btn btn-danger">' 
            + getNameOfClass(class_id) + '<span class="x-button" aria-hidden="true">&times;</span></button></div>';
        });
        htmlString += '</div';
        $("#school-classes").html(htmlString);

        /*/ Add a listener to the new html
        $(".school-class").click(function() {
            removeClass($(this).innerHTML);
        });*/
    }

    // returns name of class given class_id
    function getNameOfClass(class_id) {
        for (var name in allClassesNameToID) {
            if (allClassesNameToID[name] == class_id) {
                return name;
            }
        }
    }

    // populates the allClassesNameToID dictionary with all available classes
    function getAllClasses() {
        /*var nameToID = {};
        nameToID["Class Name 1"] = "class_id_1";        
        nameToID["Class Name 2"] = "class_id_2";
        nameToID["Class Name 3"] = "class_id_3";
        return nameToID;*/

        console.log("Getting all classes...")
        var xhr = new XMLHttpRequest();
        xhr.open('GET', "/get_all_classes", true); // responds with class_ids
        xhr.send();

        // once we have the user's classes
        xhr.onreadystatechange = function(e) {
          if (xhr.readyState == 4 && xhr.status == 200) {
            var response = JSON.parse(xhr.responseText);
            console.log(response);

            // populate the classes dictionary
            for (var i = 0; i < response.length; i++) {
                var classObj = response[i];
                allClassesNameToID[classObj.name] = classObj.class_id;
            }

            // get my classes
            getUserClasses();
          }
        }
    }

    // populates userClasses list with ids of all classes they are enrolled in
    // calls displayClasses afterward to reflect changes
    function getUserClasses() {

        console.log("Getting my classes...")
        var xhr = new XMLHttpRequest();
        xhr.open('GET', "/get_my_classes", true); // responds with class_ids
        xhr.send();

        // once we have the user's classes
        xhr.onreadystatechange = function(e) {
          if (xhr.readyState == 4 && xhr.status == 200) {
            var response = JSON.parse(xhr.responseText);

            // set userClasses to equal this list
            userClasses = response.class_ids;

            // update the UI
            displayClasses();
          }
        }
    }

    function querySearch (query) {
        //return query ? Object.keys(allClassesNameToID).filter(createFilterFor(query)) : Object.keys(allClassesNameToID);
        return query ? Object.keys(allClassesNameToID).filter(createFilterFor(query)) : [];
    }

    function removeClass(className) {
        userClasses.splice($.inArray(className, userClasses), 1);
        displayClasses(userClasses);
    }

    function saveChanges() {
        // Do whatever server stuff is needed to update the information
            
        $http.post('/enroll', {class_ids: userClasses}).then(function(response){
            document.location.href = "/";
        });
    }

    function verifyClass(className) {
        className = className.toUpperCase();
        console.log("verifying " + className);
        var returnVal = $.inArray(className, Object.keys(allClassesNameToID).map(function(x){ return x.toUpperCase() }));
        return returnVal > -1;
    }
}
