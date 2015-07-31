var sass = require('node-sass');
var path = require("path");

module.exports = function(contents, file, config, process, callback) {
  // Prevent sass from erroring about an empty file.
  if (contents != null || contents == "") {
    contents = " ";
  }

  sass.render({
    data: contents,
    includePaths: [path.dirname(file)]
  }, function(err, processed) {
    if (err != null) {
      callback(err);
      return;
    }

    callback(null, processed.css.toString());
  });
};
