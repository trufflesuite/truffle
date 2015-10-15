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

    var provisioner = provision.asString(config);

    var result = `
      (function() {
        ${provisioner}

        var __global;

        if (typeof window !== 'undefined') {
          __global = window;
        } else {
          __global = global;
        }

        __provisioner.provision_contracts(__global);
      })();
      ${contents}
    `;

    callback(null, result);
  } catch(e) {
    callback(e);
  }
};
