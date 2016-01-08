var copy = require("./copy");
var File = require("./file");

var Init = {
  all(config, callback) {
    copy(config.example.directory, config.working_dir, callback);
  }
}

module.exports = Init
