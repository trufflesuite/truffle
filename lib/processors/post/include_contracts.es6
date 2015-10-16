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
          __pudding = Pudding;
        } else {
          // Node
          __global = global;
          __pudding = require("ether-pudding");
        }

        __provisioner.provision_contracts(__global, __pudding);
      })();
      ${contents}
    `;

    callback(null, result);
  } catch(e) {
    callback(e);
  }
};
