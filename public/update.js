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

    // If enter is pressed inside the dropdown
    $("#class-dropdown").keypress(function(event) {
        if(event.which == 13) {

            var className = $("#input-0").val().toUpperCase();

            if (verifyClass(className)) {

                var class_id = allClassesNameToID[className];
                // Make sure the user isn't already in the class
                if($.inArray(class_id, userClasses) == -1) {
                    console.log("ADD " + class_id)
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
    $("#cancel-button").click(cancelChanges)
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
        var htmlString = "";
        var classNames = new Array();
        userClasses.forEach(function(class_id, index) {
            classNames.push(getNameOfClass(class_id))
        })
        classNames.sort();
        classNames.forEach(function(className, index) {
            htmlString += '<div class="school-class"><button class="btn btn-danger">' 
            + className + '<span class="x-button" aria-hidden="true">&times;</span></button></div>';
        });
        $("#school-classes").html(htmlString);

        // Add a listener to the new html
        $(".school-class").each(function(index, element) {
            $(this).click(function() {
                removeClass(userClasses[index]);
            })
        });
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
        console.log("Getting all classes...")
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

            if (response.class_ids != null) {

                // set userClasses to equal this list
                userClasses = response.class_ids;
                
                // update the UI
                displayClasses();
            }
          }
        }
    }

    function querySearch (query) {
        return query ? Object.keys(allClassesNameToID).filter(createFilterFor(query)) : [];
    }

    function removeClass(className) {
        var index = $.inArray(className, userClasses);
        console.log("Removing index " + index);
        if(index == -1) {
            console.log("Cannot remove class, className " + className + " not found!")
        }
        userClasses.splice(index, 1);
        displayClasses(userClasses);
    }

    // Server stuff
    function saveChanges() {
        var newPass = $("#new-pass-input").val();
        var hashedCurrPass = Sha1.hash($("#curr-pass-input").val());
        var hashedNewPass = Sha1.hash(newPass);
        var hashedConfirmPass = Sha1.hash($("#confirm-pass-input").val());
        // empty the input boxes after getting the data
        $(".password-input").val("");

        if (hashedCurrPass && hashedNewPass && hashedConfirmPass) {
          if (hashedNewPass === hashedConfirmPass) {
            if (newPass.length >= 6) {
                var passToServerObject = {
                    currPass: hashedCurrPass,
                    newPass: hashedNewPass,
                };
                $http.post('/resetpassword', passToServerObject).then(function(res) {
                    if(res.data.success) {
                        console.log("Password successfully changed")
                    }
                    else {
                        console.log("Current password inputted incorrectly, password not changed")
                    }
                });
            }
            else {
                console.log("Password needs >=6 characters");
            }
          }
          else {
                console.log("Passwords don't match");
          }
        }

        $http.post('/enroll', {class_ids: userClasses});
    }

    function verifyClass(className) {
        console.log("verifying " + className);
        var returnVal = $.inArray(className, Object.keys(allClassesNameToID).map(function(x){ return x.toUpperCase() }));
        return returnVal > -1;
    }
}
