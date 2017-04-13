var test = function() {
  this.hi = "hi";
  //var swag = "swag"
  this.swag = function swag() {
    console.log("woot");
  }
};
module.exports = new test();
