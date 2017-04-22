var singletonActionManager = function(cm) {

  function ChatMessage(name, email, text, roomID, timeSent, user_id) {
    this.name = name;
    this.email = email;
    this.text = text;
    this.roomID = roomID;
    this.timeSent = timeSent;
    this.user_id = user_id;
  }

  this.sendRoomMessage = function(roomID, timeSent, text, other_user_id, user_id, email, name, callback) {
    var newChatMessage = new ChatMessage(name, email, text, roomID, timeSent, user_id);
    cm.roomMessagesDatabase.child(roomID).push().set(newChatMessage);
    //if other_user_id is set, it's a DM so increment notification for other user
    if (other_user_id) {
      firebaseRoot.child("Notifications").child(other_user_id).child("MessageNotifications")
        .child(req.signedCookies.user_id).transaction(function(notification) {
          //if notification is null or 0
          if (!notification) {
            notification = 1;
          }
          else {
            notification = notification + 1;
          }
        return notification;
      });
    }
   callback(); 
  };

  this.pinMessage = function(room_id, chat_message_key, user_id, name, time_sent, concat_text, callback) {
    cm.roomPinnedMessagesDatabase.child(room_id).transaction(function(pinnedMessages) {
      if (pinnedMessages) {
        var already_pinned = false;
        pinnedMessages.forEach(function(message) {
          if (message.key == chat_message_key) {
            already_pinned = true;
          }
        })
        if (!already_pinned) {
          console.log("pinning message with concat_text " + concat_text);
          pinnedMessages.push({
            "key": chat_message_key, 
            "user_id": user_id, 
            "name": name,
            "timeSent": parseInt(time_sent),
            "text": concat_text});
        }
      }
      else {
        pinnedMessages = [{
            "key": chat_message_key, 
            "user_id": user_id, 
            "name": name,
            "timeSent": parseInt(time_sent),
            "text": concat_text}];
      }
      return pinnedMessages;
    });
    callback();
  };

  this.clearMessageNotifications = function(user_id, other_user_id, callback) {
    if (other_user_id) {
      firebaseRoot.child("Notifications").child(user_id).child("MessageNotifications")
        .child(other_user_id).set(0);
    }
    callback();
  };

};


module.exports = singletonActionManager;
