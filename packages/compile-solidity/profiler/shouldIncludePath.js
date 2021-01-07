const path = require("path");

function shouldIncludePath(filePath) {
  const validExtensions = [".sol", ".abi.json", ".json"];
  return validExtensions.some(extension => path.extname(filePath) === extension);
}

module.exports = { shouldIncludePath };
