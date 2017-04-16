var blockedUsers = {};

function toggleBlock(user_id) {
  if (!isBlocked(user_id)) {
    blockUserWithId(user_id);
  } else {
    unblock(user_id);
  }
}
  
function isBlocked(user_id) {
  if (blockedUsers['blocked_user_list']) {
    var bUsers = blockedUsers['blocked_user_list'];

    if (bUsers.indexOf(user_id) != -1) {
      return true;
    }
  }
  return false;
}

function getIdFromName(name, onResponseReceived){
  var email = {"email": String(name)};
  //console.log(email);
  $http.post('/get_Id_From_Name', email).then(function(response){
    onResponseReceived(response.data);
  });    
}

function refresh(){
  blockedUsers = {};
  $http.get('/get_blocked_users').then(function(response){
    //$scope.block_user_list = response.data;
    if(!(response.data[0])){
      return;
    }
    blockedUsers['user_id'] = response.data[0]['blocked_user_id'];
    blockedUsers['blocked_user_list'] = [];
    for (var i = 0; i < response.data.length; i++){
      var obj = response.data[i];
      blockedUsers['blocked_user_list'].push(obj['blocked_user_id']);

      if (myCalls[obj['blocked_user_id']]) {
        myCalls[obj['blocked_user_id']].close();
      }
    }
  });
}

function addBlock(blocked_user_id, onResponseReceived){
  var data = {
    "blocked_user_id": String(blocked_user_id),
  }; 
  $http.post('/add_blocked_user', data).then(function(response){
    onResponseReceived(response.data);
  });
};

refresh();

function blockUserWithId(user_id) {
  //console.log("blocking: " + user_id);
  addBlock(user_id, function(response) {
    showAlert('block-alert', 'normal', false);
    refresh();
  });
}

function unblock(user_id){
  //console.log("unblocking: " + user_id)
  $http.delete('/remove_block/' + user_id).then(function(response){
    refresh();
  });
}
/*********************************************************************/
