/* Test program to show/hide splah */

$(document).ready( function() {
  $('#btn-login').on('click', function(event) {
    $('#login-screen').slideToggle(600, 'easeInOutQuad');
  });
});
