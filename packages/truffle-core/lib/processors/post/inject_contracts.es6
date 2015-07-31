var fs = require("fs");
var provision = require("../../provision");

module.exports = function(contents, file, config, process, callback) {
  try {
    var binary_found = false
    for (var [name, contract] of Object.entries(config.contracts.classes)) {
      if (contract.binary != null) {
        binary_found = true;
        break;
      }
    }

    if (!binary_found && Object.keys(config.contracts.classes).length > 0) {
      console.log("Warning: No compiled contracts found. Did you deploy your contracts before building?");
    }

    var inserter_code = provision.asString(config);

    callback(null, inserter_code + "\n\n" + contents);
  } catch(e) {
    callback(e);
  }
};
