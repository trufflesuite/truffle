var copy = require("./copy");
var path = require("path");
var temp = require("temp").track();
var Config = require("./config");

var Init = function(destination, callback) {
  var example_directory = path.resolve(path.join(__dirname, "..", "example"));
  copy(example_directory, destination, callback);
}

Init.sandbox = function(extended_config, callback) {
  var self = this;
  extended_config = extended_config || {}

  if (typeof extended_config == "function") {
    callback = extended_config;
    extended_config = {};
  }

  temp.mkdir("truffle-sandbox-", function(err, dirPath) {
    if (err) return callback(err);

    Init(dirPath, function(err) {
      if (err) return callback(err);

      var config = Config.load(path.join(dirPath, "truffle.js"), extended_config);
      callback(null, config);
    });
  });
};

module.exports = Init;
