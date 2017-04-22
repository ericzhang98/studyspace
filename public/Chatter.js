/* Used for sending and receiving messages */
/* Exists as singleton within Angular app */

function Chatter(myID, cruHandler) {

  this.currRoomChatID = null;
  this.chatMessageList = [];
  this.searchQuery = null;
  this.searchMode = true;

  const CONCAT_TIME = 60*1000; // 1 minute
  var thisChatter = this;
  var chatDatabase = null;

  // list of message objects with: email, name, roomID, text, timeSent
  var div = document.getElementById("chat-message-pane");
  var chatInputBox = document.getElementById("chatInputBox");
  var loadingMessagesAnimation = document.getElementById("loading-messages");
  var lastKey = null;
  var scrollLock = false;
  var loadingOverallAnimation = document.getElementById("loading-overall");
  
  /************************* JOINING A CHATROOM ************************/

  // Join a room's chat
  this.joinRoomChat = function(room_id) {

    if (this.currRoomChatID != room_id) {

      this.currRoomChatID = room_id;

      // turn off any pre-existing listeners
      if (chatDatabase != null) {
        chatDatabase.off();
      }
      // empty our message list in logic and UI and reset control vars
      this.chatMessageList = [];

      lastKey = null;
      scrollLock = false;
      updateChatView();
      this.chatInput = "";
   		this.searchQuery = null;
      this.searchMode = false;

      // set up and start new listener if room_id isn't null
      if (room_id) {
        chatDatabase = databaseRef.child("RoomMessages").child(this.currRoomChatID);
        startChatMessages();
      }
    }
  }
  /*********************************************************************/
  /*************************** SENDING CHATS ***************************/

  // Send chat when send button is pressed
  this.sendChatMessage = function(chatInput) {
    if (chatInput) {
      uploadMessage(chatInput);
    }
  };

  // Upload message to the database
  function uploadMessage(chatInput) {

    // If we're in a valid room
    if (this.currRoomChatID) {

      //console.log("Sending chat with: " + chatInput);

      // Create the message and pass it on to the server
      var newChatMessage = {text: chatInput, roomID: this.currRoomChatID, timeSent: Date.now()};

      //adjust newChatMessage with whether or not it's a DM
      if (cruHandler.rooms[this.currRoomChatID].other_user_id) {
        newChatMessage.other_user_id = cruHandler.rooms[this.currRoomChatID].other_user_id;
      }

      $http.post("/send_room_message", newChatMessage).then(scrollDown);
    }

    // Reset the local chat UI/logic
    this.chatInput = "";
    chatInputBox.focus();
  }

  /************************** DISPLAYING CHATS *************************/

  // Set up listener for chat messages
  function startChatMessages() {
    loadingOverallAnimation.removeAttribute("hidden");
    chatPinnedDatabase.on("child_added", function(snapshot) {
      var snapshotValue = snapshot.val();
      //console.log("pin message: " + snapshotValue.text);
      if (this.chatPinnedMessageList.indexOf(snapshotValue) == -1) {
        this.chatPinnedMessageList.push(snapshotValue);
      }
      updateChatView();
    })

    chatDatabase.limitToLast(50).on("child_added", function(snapshot) {
      var snapshotValue = snapshot.val();
      snapshotValue.key = snapshot.key;

      if (lastKey == null) {
        lastKey = snapshot.key;
      }

      this.chatMessageList.push(snapshotValue);

      attemptAutoScroll();
      // scroller
      // typer
      // songer
      /*var shouldScroll = false;
      //only auto-scroll if near bottom
      if (div.scrollTop + 200 >= (div.scrollHeight - div.clientHeight)) {
        shouldScroll = true;
      }
      updateChatView();
      if (shouldScroll) {
        //setTimeout(scrollDown, 10); //scroll again upon ui update in 10ms
        scrollDown(); //scroll down immediately to ensure continuous position
      }
      loadingOverallAnimation.setAttribute("hidden", null);*/
    });

    //slight jank, but it's cool
    /*setTimeout(function() {
      loadingOverallAnimation.setAttribute("hidden", null);
    }, 500);*/
  }

  // Update the chat view display
  function updateChatView() {
    concatenateMessages();
    $rootScope.safeApply($scope);
  }

  // Combine messages sent by the same user within
  // CONCAT_TIME seconds of one another;
  function concatenateMessages() {
    for (var i = 0; i + 1 < this.chatMessageList.length;) {
      currMessage = this.chatMessageList[i];
      nextMessage = this.chatMessageList[i+1];
      // if two messages were sent by the same user within CONCAT_TIME
      if (currMessage.email == nextMessage.email &&
          nextMessage.timeSent < currMessage.timeSent + CONCAT_TIME) {
        // concatenate the messages
        currMessage.text += "\n" + nextMessage.text;
        // remove the second message
        this.chatMessageList.splice(i+1, 1);
      }
      else {
        i++;
      }
    }
  }

  // View more messages -- queries last number of msgs from Firebase and
  // updates chat view, then scrolls to correct place to maintain position
  function seeMoreMessages(messagesToAdd, callback) {
    //check if a lastKey is ready, signifying that og msgs have finished
    if (lastKey && lastKey != "DONE") {
      //show loading UI element
      loadingMessagesAnimation.removeAttribute("hidden");
      scrollLock = true; //prevent any more seeMoreMessages calls until current finishes
      var messagesSoFar = this.chatMessageList.length;
      //query db for past number of messages
      chatDatabase.limitToLast(messagesToAdd+1).orderByKey().endAt(lastKey)
        .once("value", function(snapshot) {
        var snapshotValue = snapshot.val();
        if (snapshotValue) {
          lastKey = Object.keys(snapshotValue)[0];
          //console.log("pulled more messages + 1: " + (Object.keys(snapshotValue).length));
          //var messageArray = Object.values(snapshotValueObject)
          var moreMessagesArray = Object.keys(snapshotValue).map(function(key) {
            var eachValue = snapshotValue[key];
            eachValue.key = key;
            return eachValue;
          });
          moreMessagesArray.pop(); //remove extra messsage b/c lastKey inclusive

          if (moreMessagesArray.length > 0) {
            this.chatMessageList = moreMessagesArray.concat(this.chatMessageList); //combine with og msgs
          }
          else {
            lastKey = "DONE"; //otherwise don't pull anymore
          }

          //keep track of height diff, update view, and then scroll by diff
          var previousHeight = div.scrollHeight;
          var previousPosition = div.scrollTop;
          ////console.log("prev height: " + (previousHeight));
          ////console.log("prev pos: " + (previousPosition));
          updateChatView();
          //setTimeout(function(){
          //$timeout(function(){
          var currHeight = div.scrollHeight;
          ////console.log("curr height: " + currHeight);
          ////console.log("Scroll down by: " + (currHeight - previousHeight));
          div.scrollTop = previousPosition + (div.scrollHeight - previousHeight);
          scrollLock = false;
          //hide loading UI element
          //});
          //}, 20);
          
        }
        loadingMessagesAnimation.setAttribute("hidden", null);
        if (callback){callback();}
      });
    }
    else {
      if (callback){callback();}
    }
  }

  // Scroll chat view to bottom 
  function scrollDown() {
    div.scrollTop = div.scrollHeight - div.clientHeight;
  }

}