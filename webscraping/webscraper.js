var socsjs = require('socsjs');
var fs = require("fs");


var depts = [];
var x = 0;


fs.readFile("subjectIDs", "utf8", function(err, data) {

  if (err) {
    return console.log(err);
  }

  var arr = data.split("\n");
  depts = arr;

  //console.log(arr);

  console.log("STARTING!");
  scrapeDepartment();
});

function scrapeDepartment() {

  var quarter = 'WI17';
  var timeout = 10000;
  var undergrad = true;   // optional boolean to select only undergrad courses (< 200)

  var dept = depts[x];
  console.log("SEARCHING: " + dept + " AT INDEX: " + x);

  socsjs.searchDepartment(quarter, dept, timeout, undergrad).then(function(result) {
    if (result) {
      for (var i = 0; i < result.length; i++){
        var obj = result[i];
        if (obj.name) {
          console.log(obj.name);
          fs.appendFile("classlist", obj.name + "\n");
        }
      }
    }
    x++;
    scrapeDepartment();
  }).catch(function(err) {
      console.log(err, "oops!");
      console.log("KEEP GOING");
      x++;
      scrapeDepartment();
  });
}
