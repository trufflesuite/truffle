const path = require("path");

function shouldIncludePath(filePath) {
  return path.extname(filePath) !== ".vy";
}

module.exports = { shouldIncludePath };
