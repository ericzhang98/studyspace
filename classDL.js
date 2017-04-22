var singletonClassDLManager = function(cm) {

  this.addUserToDL = function(user_id, class_id, callback) {
    cm.classDLDatabase.child(class_id).push().set(user_id);
    callback();
  }

}

module.exports = singletonClassDLManager;