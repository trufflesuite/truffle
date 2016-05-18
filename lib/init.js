var copy = require("./copy");
var path = require("path");

module.exports = function(destination, callback) {
  var example_directory = path.resolve(path.join(__dirname, "..", "example"));
  copy(example_directory, destination, callback);
}
