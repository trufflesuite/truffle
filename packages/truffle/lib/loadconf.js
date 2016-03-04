var fs = require("fs");
var jsmin = require("jsmin").jsmin;
var _ = require("lodash");
var ConfigurationError = require('./errors/configurationerror');

module.exports = function(full_path, base, callback) {
  if (typeof base == "function") {
    callback = base;
    base = {};
  }

  base = base || {};

  fs.readFile(full_path, {encoding: "utf8"}, function(err, file_contents) {
    if (err != null) {
      callback(err, file_contents);
      return;
    }

    // Run the results through jsmin to remove any comments.
    // It's nice to have comments in config files even through
    // it's not valid JSON.
    try {
      file_contents = JSON.parse(jsmin(file_contents));
      file_contents = _.merge(base, file_contents);
    } catch(e) {
      callback(new ConfigurationError("Error while parsing " + full_path + ": " + (e.message || e)));
      return;
    }

    callback(null, file_contents);
  });
}
