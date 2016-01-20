module.exports = function(contents, file, options, process, callback) {
  var pkg = require("../package.json");
  contents = contents.replace("{{VERSION}}", pkg.version);
  callback(null, contents);
};
