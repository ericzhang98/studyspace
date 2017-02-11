/* Toggle modals */

$(document).ready(function() {

  /* Login Modal */
  $("#link-login").click(function() {
    $("#modal-login").fadeIn(100);
    setTimeout(function() {
      $("#login").removeClass("hide");
      $("#login").addClass("fadeInBack");
    }, 100);
  });
  $("#close-login").click(function() {
    $("#modal-login").fadeOut(100);
    setTimeout(function() {
      $("#login").removeClass("fadeInBack");
      $("#login").addClass("hide");
    }, 100);
  });
  
  /* Create Class Modal */
  $("#btn-create-room").click(function() {
    $("#modal-create-room").fadeIn(100);
    setTimeout(function() {
      $("#create-room").removeClass("hide");
      $("#create-room").addClass("fadeInBack");
    }, 100);
  });
  $("#close-create-room").click(function() {
    $("#modal-create-room").fadeOut(100);
    setTimeout(function() {
      $("#create-room").removeClass("fadeInBack");
      $("#create-room").addClass("hide");
    }, 100);
  });
  
});
