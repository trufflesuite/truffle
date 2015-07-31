var UglifyJS = require("uglify-js");

module.exports = function(contents, file, config, process, callback) {
  try {
    var code = UglifyJS.minify(contents, {fromString: true}).code;
    callback(null, code);
  } catch(e) {
    callback(e);
  }
};
