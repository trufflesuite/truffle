var CoffeeScript = require('coffee-script');
var fs = require("fs");

module.exports = function(contents, file, config, process, callback) {
  try {
    callback(null, CoffeeScript.compile(contents));
  } catch(e) {
    callback(e);
  }
};
