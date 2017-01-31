$(document).ready(function() {
    $("#cancel-button").click(cancelChanges)

    $("#save-button").click(saveChanges)
})

function cancelChanges() {
    window.location.replace("./index.html")
}

function saveChanges() {
    // Do whatever server stuff is needed to update the information

    window.location.replace(".index.html")
}