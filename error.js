var singletonErrorManager = function() {

  /*
   * error obj:
   * {
   *   code: some num to represent the error
   *   message: string describing the error (optional)
   * }
   */
  function error(code, message) {
    this.code = code;
    this.message = message;
  }
  this.createError = function(code, message) {
    return new error(code, message);
  }

  //Some shortcuts for common errors
  this.iui = new error(1, "invalid_user_id"); //if someone doesn't have correct signedCookie

}

module.exports = singletonErrorManager;
