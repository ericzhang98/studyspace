Object.values = Object.values || function(o){return Object.keys(o).map(function(k){return o[k]})}

angular
   .module('MyApp', ['ngMaterial'])
   .controller('updateController', autoCompleteController);

function autoCompleteController ($timeout, $q, $log, $http) {
    // Global Variables
    var userClasses = getUserClasses(); // list of class_ids
    displayClasses(userClasses);
    var allClassesNameToID = getAllClasses();     // name: class_id
    //var allClasses = getAllClasses();
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

    function addClass(classID) {
        console.log("adding class with ID " + classID);
        userClasses.push(classID);
        displayClasses(userClasses);
    }

    function cancelChanges() {
        document.location.href = "/";
    }

    //filter function for search query
    function createFilterFor(query) {
        var uppercaseQuery = query.toUpperCase();
        return function filterFn(thisClass) {
            return (thisClass.toUpperCase().indexOf(uppercaseQuery) === 0);
        };
    }

    function displayClasses(classesArray) {
        classesArray.sort();
        var htmlString = '<div class="school-class">';
        classesArray.forEach(function(class_id, index) {
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

    function getNameOfClass(class_id) {
        for (var name in allClassesNameToID) {
            if (allClassesNameToID[name] == class_id) {
                return name;
            }
        }
    }

    function getAllClasses() {
        var nameToID = {};
        nameToID["Class Name 1"] = "class_id_1";        
        nameToID["Class Name 2"] = "class_id_2";
        nameToID["Class Name 3"] = "class_id_3";
        return nameToID;
    }

    function getUserClasses() {
        // TODO query the server and get the users classes
        return new Array();
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
