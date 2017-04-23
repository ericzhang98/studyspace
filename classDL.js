var singletonClassDLManager = function(cm) {

  this.toggleUserDL = function(user_id, class_id, callback) {
    cm.classDLDatabase.child(class_id).child(user_id).once("value", function(snapshot) {
      cm.classDLDatabase.child(class_id).child(user_id).set(snapshot ? !snapshot.val() : true);
      callback();
    });
  }

}

module.exports = singletonClassDLManager;