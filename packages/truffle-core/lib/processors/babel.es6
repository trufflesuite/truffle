var babel = require('babel');
var fs = require("fs");

module.exports = function(contents, file, config, process, callback) {
  try {
    callback(null, babel.transform(contents, {filename: file, compact: false}).code);
  } catch(e) {
    callback(e);
  }
};
