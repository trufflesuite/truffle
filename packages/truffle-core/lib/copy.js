var cpr = require("cpr");
var fs = require("fs");
var _ = require("lodash");

var cpr_options = {
  deleteFirst: false,
  overwrite: false,
  confirm: true
};

module.exports = function(from, to, extra_options, callback) {
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
