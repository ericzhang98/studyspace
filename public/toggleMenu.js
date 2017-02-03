/* Test program to show/hide splah */

$(document).ready(function() {
  $("#link-login").click(function() {
    $("#modal-login").fadeToggle(200);
    $("#login").toggleClass("fadeInBack");
  });
  $("#close-login").click(function() {
    $("#modal-login").fadeToggle(200);
    $("#login").toggleClass("fadeInBack");
  });
});
