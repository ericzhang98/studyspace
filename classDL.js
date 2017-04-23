var singletonClassDLManager = function(cm) {

  // toggles a user's down status in a class
  this.toggleUserDL = function(user_id, class_id, callback) {
    cm.classDLDatabase.child(class_id).child(user_id).once("value", function(snapshot) {
      var isDown = snapshot ? !snapshot.val() : true;
      cm.classDLDatabase.child(class_id).child(user_id).set(isDown);
      callback(isDown);
    });
  }

}

module.exports = singletonClassDLManager;