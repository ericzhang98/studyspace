var singletonClassManager = function() {

  var mongojs = require('mongojs');
  var db = mongojs('mongodb://studyspace:raindropdroptop@ds033086.mlab.com:33086/studyspace', []);

  this.getAllClasses = function(res) {
    db.classes.find({}, function (err, doc) {
      res.send(doc);
    });
  }

  this.getClassInfo = function(class_id, res) {
    db.classes.findOne({class_id: class_id}, function (err, doc) {
      res.send(doc);
    });
  }
}

module.exports = new singletonClassManager();
