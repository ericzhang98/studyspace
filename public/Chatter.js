/* Used for sending and receiving messages */
/* Exists as singleton within Angular app */

function Chatter(myID, cruHandler) {

  this.currRoomChatID = null;
  this.chatMessageList = [];
  this.currTyping = [];
  this.isTyping = false;
  this.searchQuery = null;
  this.searchMode = true;
  this.searchMessageList = [];
  this.scrollLock = false;
  var lastKey = null;

  this.clearInput = null;
  this.scrollDown = null;
  this.apply = null;

  const CONCAT_TIME = 60*1000; // 1 minute
  var thisChatter = this;
  var chatDatabase = null;
  var typingDatabase = null;
  var commander = null;

  // list of message objects with: email, name, roomID, text, timeSent
  var div = document.getElementById("chat-message-pane");
  var chatInputBox = document.getElementById("chatInputBox");
  var loadingMessagesAnimation = document.getElementById("loading-messages");
  var loadingOverallAnimation = document.getElementById("loading-overall");


  this.joinRoomChat = function(currRoomChatID) {
    //leave old room if we were in one
    if (this.currRoomChatID) {
      // turn off any pre-existing listeners
      if (chatDatabase != null) {
        chatDatabase.off();
      }
      // empty typing list
      if (typingDatabase != null) {
        typingDatabase.off();
      }
      this.isTyping = false;
      var typingXHR = new XMLHttpRequest();
      typingXHR.open("GET", "/typing/false/" + this.currRoomChatID);
      typingXHR.send();
    }

    //join new room
    this.currRoomChatID = currRoomChatID;

    // empty our message list in logic and UI and reset control vars
    this.chatMessageList = [];
    lastKey = null;
    this.scrollLock = false;
    this.chatInput = "";
    this.currTyping = [];
    this.searchQuery = null;
    this.searchMode = false;
    this.searchMessageList = [];
    updateChatView();

    // set up and start new listener if room_id isn't null
    if (this.currRoomChatID) {
      chatDatabase = databaseRef.child("RoomMessages").child(this.currRoomChatID);
      startChatMessages();
    }
    if (this.currRoomChatID) {
      typingDatabase = databaseRef.child("RoomTyping").child(this.currRoomChatID);
      startCurrTyping();
      //], 50); //in case it's a dm, need to wait for other user info?
    }

    //set up commander
    commander = new Commander(this.currRoomChatID);
  }

  this.sendChatMessage = function(chatInput) {
    //easter eggs
    if (SECRET_COMMANDS.indexOf(chatInput) != -1) {
      commander.easterCommand(chatInput, function(data){uploadMessage(data)});
      this.clearInput();
      this.focusInput();
    }
    //play command
    else if (chatInput.indexOf("/play") == 0) {
      commander.playCommand(chatInput);
      this.clearInput();
      this.focusInput();
    }
    //stop command
    else if (chatInput.indexOf("/stop") == 0) {
      commander.stopCommand();
      this.clearinput();
      this.focusInput();
    }
    //search
    else if (chatInput.indexOf("#") == 0) {
      search(chatInput);
    }
    //regular chat
    else {
      uploadMessage(chatInput);
    }
  }

  this.processTyping = function(chatInput) {
    if (chatInput) {
      if (!this.isTyping) {
        var typingXHR = new XMLHttpRequest();
        typingXHR.open("GET", "/typing/true/" + this.currRoomChatID);
        typingXHR.send();
        this.isTyping = true;
      }
    }
    else {
      if (this.isTyping) {
        var typingXHR = new XMLHttpRequest();
        typingXHR.open("GET", "/typing/true/" + this.currRoomChatID);
        typingXHR.send();
        this.isTyping = false;
      }
    }
  }

  this.messageClicked = function(messageDiv) {
    if (this.searchMode) {
      //return to normal with div selection
      loadingOverallAnimation.removeAttribute("hidden");
      //maximum jank to let animation start
      setTimeout(function(){
        thisChatter.searchMode = false;
        thisChatter.searchQuery = null;
        thisChatter.scrollLock = false;
        thisChatter.apply();
        loadingOverallAnimation.setAttribute("hidden", null);
        div.scrollTop = messageDiv.offsetTop;
      }, 10);
    }
  }








  function startChatMessages() {
    loadingOverallAnimation.removeAttribute("hidden");

    chatDatabase.limitToLast(50).on("child_added", function(snapshot) {
      var snapshotValue = snapshot.val();
      snapshotValue.key = snapshot.key;

      if (lastKey == null) {
        lastKey = snapshot.key;
      }

      thisChatter.chatMessageList.push(snapshotValue);
      var shouldScroll = false;
      //only auto-scroll if near bottom
      if (div.scrollTop + 200 >= (div.scrollHeight - div.clientHeight)) {
        shouldScroll = true;
      }
      updateChatView();
      if (shouldScroll) {
        //setTimeout(scrollDown, 10); //scroll again upon ui update in 10ms
        thisChatter.scrollDown(); //scroll down immediately to ensure continuous position
      }
      loadingOverallAnimation.setAttribute("hidden", null);
    });

    //slight jank, but it's cool
    setTimeout(function() {
      loadingOverallAnimation.setAttribute("hidden", null);
    }, 500);
  }

  function updateChatView() {
    concatenateMessages();
    thisChatter.apply();
  }

  function concatenateMessages() {
    for (var i = 0; i + 1 < thisChatter.chatMessageList.length;) {
      currMessage = thisChatter.chatMessageList[i];
      nextMessage = thisChatter.chatMessageList[i+1];
      // if two messages were sent by the same user within CONCAT_TIME
      if (currMessage.email == nextMessage.email &&
          nextMessage.timeSent < currMessage.timeSent + CONCAT_TIME) {
        // concatenate the messages
        currMessage.text += "\n" + nextMessage.text;
        // remove the second message
        thisChatter.chatMessageList.splice(i+1, 1);
      }
      else {
        i++;
      }
    }
  }









  

  function uploadMessage(chatInput) {
    console.log("SENDING CHAT MESSAGE");
    // If we're in a valid room
    if (thisChatter.currRoomChatID) {
          console.log("SENT CHAT MESSAGE");
      // Create the message and pass it on to the server
      var newChatMessage = {text: chatInput, roomID: thisChatter.currRoomChatID, timeSent: Date.now()};
      //adjust newChatMessage with whether or not it's a DM
      if (cruHandler.rooms[thisChatter.currRoomChatID].other_user_id) {
        newChatMessage.other_user_id = cruHandler.rooms[thisChatter.currRoomChatID].other_user_id;
      }
      var messageXHR = new XMLHttpRequest();
      messageXHR.open("POST", "/send_room_message/");
      messageXHR.onreadystatechange = function(e) {
        if (messageXHR.readyState == 4 && messageXHR.status == 200) {
          thisChatter.scrollDown();
        }
      }
      messageXHR.setRequestHeader("Content-Type", "application/json");
      messageXHR.send(JSON.stringify(newChatMessage));
    }

    // Reset the local chat UI/logic
    thisChatter.clearInput();
    thisChatter.focusInput();
  }













  // Listen to RoomTyping
  function startCurrTyping() {
    typingDatabase.on("value", function(snapshot) {
      var val = snapshot.val();
      if (val) {
        thisChatter.currTyping = Object.keys(val);
        updateCurrTyping();
      }
      else {
        thisChatter.currTyping = [];
      }
      thisChatter.apply();
    });
  }

  function updateCurrTyping() {
    var names = []
    for (var i = 0; i < thisChatter.currTyping.length; i++) {
      if (thisChatter.currTyping[i] != myID) {
        if (cruHandler.users[thisChatter.currTyping[i]]) {
         names.push(cruHandler.users[thisChatter.currTyping[i]].name);
        }
      }
    }
    thisChatter.currTyping = names;
  }



  this.seeMoreMessages = function(num, callback) {
    seeMoreMessages(num, callback);
  }

  //see more
  // View more messages -- queries last number of msgs from Firebase and
  // updates chat view, then scrolls to correct place to maintain position
  function seeMoreMessages(messagesToAdd, callback) {
    //check if a lastKey is ready, signifying that og msgs have finished
    if (lastKey && lastKey != "DONE") {
      //show loading UI element
      loadingMessagesAnimation.removeAttribute("hidden");
      thisChatter.scrollLock = true; //prevent any more seeMoreMessages calls until current finishes
      var messagesSoFar = thisChatter.chatMessageList.length;
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
            thisChatter.chatMessageList = moreMessagesArray.concat(thisChatter.chatMessageList); //combine with og msgs
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
          var currHeight = div.scrollHeight;
          ////console.log("curr height: " + currHeight);
          ////console.log("Scroll down by: " + (currHeight - previousHeight));
          div.scrollTop = previousPosition + (div.scrollHeight - previousHeight);
          thisChatter.scrollLock = false;
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


  function search(chatInput) {
    var query = chatInput.substring(1);
    //search mode
    if (query.length > 0) {
      loadingOverallAnimation.removeAttribute("hidden");
      thisChatter.searchMode = true;
      thisChatter.searchQuery = query;
      seeMoreMessages(1000, function(){
        var searchResults = [];
        for(var i = thisChatter.chatMessageList.length-1; i >= 0; i--) {
          if (thisChatter.chatMessageList[i].text.toLowerCase().includes(query.toLowerCase()) 
            || thisChatter.chatMessageList[i].name.toLowerCase().includes(query.toLowerCase())) {
            searchResults.unshift(thisChatter.chatMessageList[i]);
          }
        }
      thisChatter.searchMessageList = searchResults;
      thisChatter.scrollLock = true;
      thisChatter.apply();
      loadingOverallAnimation.setAttribute("hidden", null);
      thisChatter.scrollDown();
      });
    }
    //nosearch mode
    else {
      loadingOverallAnimation.removeAttribute("hidden");
      //maximum jank to let animation start
      setTimeout(function(){
        thisChatter.searchMode = false;
        thisChatter.searchQuery = null;
        thisChatter.scrollLock = false;
        thisChatter.apply();
        loadingOverallAnimation.setAttribute("hidden", null);
        thisChatter.scrollDown();
      }, 10);
    }
    thisChatter.clearInput();
  }



}

