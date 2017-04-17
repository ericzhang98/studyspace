/* Used for listenening to volumes and responding to changes*/
/* Exists as singleton within Caller object */

function VolumeListener() {

  /***** Public Variables ***************************/
  this.volumes = {};                // dictionary from user_id to soundMeter
  /**************************************************/

  /***** Private Variables **************************/
	const thisVolumeListener = this;	// a reference to this VolumeListener object
	var onLoudChangeFunc = null;			// function to execute when a soundMeter's loudness changes
  /**************************************************/

  /************************** Public Functions *************************/
	// - adds a user_id : soundMeter entry to the volumes dict
  this.setVolumeListener = function(user_id, stream) {
    var soundMeter = new SoundMeter(window.audioContext);

    //console.log('setting volume listener to ' + user_id);
    soundMeter.connectToSource(stream, function(e) {
      if (e) {
        alert(e);
        return;
      }

      // add in the user_id : soundMeter entry
      thisVolumeListener.volumes[user_id] = soundMeter;

      // every 500 seconds, check whether the soundMeter has been loud
      // update UI if this has changed
      setInterval(function() {
    
        if (soundMeter.loudDetected != soundMeter.loud) {
          //console.log("changing volume to " + soundMeter.loudDetected);
          soundMeter.loud = soundMeter.loudDetected;

          // callback when a soundMeter's loudness changes
          onLoudChangeFunc();
        }

        // reset loudDetected for the next interval
        soundMeter.loudDetected = false;
      }, 500);
    });
  }

  // - sets a callback function to be executed 
  //   when a soundMeter's loudness changes
  this.setOnLoudChangeFunc = function(func) {
  	onLoudChangeFunc = func;
  }
  /*********************************************************************/
}