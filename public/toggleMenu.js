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

  /* Add Class Modal */
  $("#btn-add-class").click(function() {
    $("#modal-add-class").fadeIn(100);
    setTimeout(function() {
      $("#add-class").removeClass("hide");
      $("#add-class").addClass("fadeInBack");
    }, 100);
  });

  $("#close-add-class").click(function() {
    closeModal("#modal-add-class", "#add-class");
  });
  
});

function closeModal(modal_name, content_name) {
  $(modal_name).fadeOut(100);
  setTimeout(function() {
    $(content_name).removeClass("fadeInBack");
    $(content_name).addClass("hide");
  }, 100);
}

//exit out modals if esc key pressed
document.onkeydown = function(evt) {
  evt = evt || window.event;
  if (evt.keyCode == 27) {
    closeModal("#modal-login", "#login");
    closeModal("#modal-create-room", "#create-room");
    closeModal("#modal-add-class", "#add-class");
  }
};
