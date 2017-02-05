angular
   .module('MyApp', ['ngMaterial'])
   .controller('updateController', autoCompleteController);

function autoCompleteController ($timeout, $q, $log) {
    // Global Variables
    var self = this;
    var userClasses = getUserClasses();
    displayClasses(userClasses);
    var classes = getAllClasses();
    // list of states to be displayed
    self.querySearch = querySearch;

    $("#cancel-button").click(cancelChanges)

    // If enter is pressed inside the dropdown
    $("#class-dropdown").keypress(function(event) {
        if(event.which == 13) {
            var className = $("#input-0").val();
            var verify = verifyClass(className);
            if(verify == true) {
                // Make sure the user isn't already in the class
                if($.inArray(className, userClasses) == -1) {
                    addClass(className);
                }
            }
        }
    });

    $("#save-button").click(saveChanges);

    function addClass(className) {
        console.log("adding class " + className);
        userClasses.push(className);
        displayClasses(userClasses);
        // TODO Send new class to server
    }

    function cancelChanges() {
        window.location.replace("./index.html")
    }

    //filter function for search query
    function createFilterFor(query) {
        var uppercaseQuery = query.toUpperCase();
        return function filterFn(thisClass) {
            return (thisClass.indexOf(uppercaseQuery) === 0);
        };
    }

    function displayClasses(classesArray) {
        classesArray.sort();
        var htmlString = '<div class="school-class">';
        classesArray.forEach(function(element, index) {
            htmlString += '<div class="school-class"><button class="btn btn-danger">' + element + '<span class="x-button" aria-hidden="true">&times;</span></button></div>';
        })
        htmlString += '</div';
        $("#school-classes").html(htmlString);

        // Add a listener to the new html
        $(".school-class").click(function() {
            removeClass($(this).innerHTML);
        });
    }

    function getAllClasses() {
        var classArr = new Array();
        classArr.push("CSE110");
        classArr.push("MATH18");
        classArr.push("ECE45");
        return classArr.sort();
    }

    function getUserClasses() {
        // TODO query the server and get the users classes
        return new Array();
    }

    function querySearch (query) {
        return query ? classes.filter( createFilterFor(query) ) : classes;
    }

    function removeClass(className) {
        userClasses.splice($.inArray(className, userClasses), 1);
        displayClasses(userClasses);
    }

    function saveChanges() {
        // Do whatever server stuff is needed to update the information

        window.location.replace("index.html")
    }

    function verifyClass(className) {
        className = className.toUpperCase();
        console.log("verifying " + className)
        var returnVal = $.inArray(className, classes);
        return returnVal > -1;
    }
}
