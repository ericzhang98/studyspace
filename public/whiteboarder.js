function whiteboarder() {

  this.currRoomCallID = null;

  var whiteboard = document.getElementById("whiteboard");
  var whiteboardContainer = document.getElementById("whiteboard-container");
  var whiteboardOn = false;

  this.showWhiteboard = function() {
    this.whiteboardOn = true;
    whiteboard.setAttribute("src", "whiteboard.html#" + this.currRoomCallID);
    whiteboardContainer.removeAttribute("hidden");
  }

  this.hideWhiteboard = function() {
    this.whiteboardOn = false;
    whiteboardContainer.setAttribute("hidden", null);
  }

  this.toggleWhiteboard = function() {
    if (whiteboardOn) {
      this.hideWhiteboard();
    }
    else {
      this.showWhiteboard();
    }
    whiteboardOn = !whiteboardOn;
  }

}
