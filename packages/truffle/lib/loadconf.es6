var fs = require("fs");
var jsmin = require("jsmin").jsmin;
var _ = require("lodash");

module.exports = function(full_path, base={}, callback) {
  if (typeof base == "function") {
    callback = base;
    base = {};
  }

  fs.readFile(full_path, "utf8", function(err, file_contents) {
    if (err != null) {
      callback(err, file_contents);
      return;
    }

    // Run the results through jsmin to remove any comments.
    // It's nice to have comments in config files even through
    // it's not valid JSON.
    file_contents = JSON.parse(jsmin(file_contents));
    file_contents = _.merge(base, file_contents);

    callback(null, file_contents);
  });
}
