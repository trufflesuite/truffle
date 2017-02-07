var path = require("path");

module.exports = function(filePath) {
  delete require.cache[path.resolve(filePath)];
  return require(filePath);
};
