/* Cookie helper functions ---------------------------------------------------*/
/* Returns the cookie value for a key (null if no cookie with key exists) */
function getCookie(key) {
  var cookieName = key + "=";
  var cookieArray = document.cookie.split(";");
  for (var i = 0; i < cookieArray.length; i++) {
    var cookie = cookieArray[i];
    while (cookie.charAt(0) == ' ') {
      cookie = cookie.substring(1);
    }
    if (cookie.indexOf(cookieName) == 0) {
      return cookie.split("=")[1];
    }
  }
  return null;
}

/* Stores a cookie with key-value at root (expires in 7 days) */
function storeCookie(key, value) {
  var expirationDate = new Date(Date.now() + 7*24*60*60*1000);
  document.cookie = key + "=" + value + ";expires=" + 
    expirationDate.toUTCString() + ";path=/";
}

/* Removes a cookie with specified key */
function removeCookie(key) {
  document.cookie = key + "=" + null + ";expires=Thu, 01 Jan 1970 00:00:00 GMT" + ";path=/";
}

/* Returns the cookie value for a key, ONLY USE ON SIGNED COOKIES */
function getSignedCookie(key) {
  var cookieName = key + "=";
  var cookieArray = document.cookie.split(";");
  for (var i = 0; i < cookieArray.length; i++) {
    var cookie = cookieArray[i];
    while (cookie.charAt(0) == ' ') {
      cookie = cookie.substring(1);
    }
    if (cookie.indexOf(cookieName) == 0) {
      var cookieValue = decodeURIComponent(cookie.split("=")[1]);
      var periodSplit = cookieValue.split(".");
      periodSplit.pop();
      var value = periodSplit.join(".");
      return value.substring(2);
    }
  }
  return null;
}
/*----------------------------------------------------------------------------*/
