const path = require("path");

function shouldIncludePath(filePath) {
  return path.extname(filePath) === ".sol";
}

module.exports = { shouldIncludePath };
