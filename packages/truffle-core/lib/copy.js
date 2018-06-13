var cpr = require("cpr");
var fs = require("fs");
var _ = require("lodash");

var cpr_options = {
  deleteFirst: false,
  overwrite: false,
  confirm: true
};

// This module will copy a file or directory, and by default
// won't override individual files. If a file exists, it will
// simply move onto the next file.

var copy = function(from, to, extra_options, callback) {
  if (typeof extra_options == "function") {
    callback = extra_options;
    extra_options = {};
  }

  var options = _.merge(_.clone(cpr_options), extra_options);

  cpr(from, to, options, function(err, files) {
    var new_files = [];

    // Remove placeholders. Placeholders allow us to copy "empty" directories,
    // but lets NPM and git not ignore them.
    files = files || [];
    for (var file of files) {
      if (file.match(/.*PLACEHOLDER.*/) != null) {
        fs.unlinkSync(file);
        continue;
      }
      new_files.push(file);
    }

    callback(err, new_files);
  });
}

copy.file = function(from, to, callback) {
  var readStream = fs.createReadStream(from, "utf8");
  var writeStream = fs.createWriteStream(to, "utf8");

  readStream.on("error", function(err) {
    callback(err);
    callback = function() {};
  });

  writeStream.on("error", function(err) {
    callback(err);
    callback = function() {};
  });

  writeStream.on("finish", function() {
    callback();
  });

  readStream.pipe(writeStream);
};

module.exports = copy;
