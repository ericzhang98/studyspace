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
    closeModal("#modal-login", "#login");
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
    closeModal("#modal-create-room", "#create-room");
  });
  
});

function closeModal(modal_name, content_name) {
  $(modal_name).fadeOut(100);
  setTimeout(function() {
    $(content_name).removeClass("fadeInBack");
    $(content_name).addClass("hide");
  }, 100);
}
