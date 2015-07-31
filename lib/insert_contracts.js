// This file represents code that gets inserted into the frontend
// at build time. It's also used within Node for provisioning the
// REPL. Items in {{ }} are replaced prior to execution.
// NOTE: This is ES5 code! (with our own gerryrigged template.)

// The following line is to prevent errors in the browser.
var module = module || undefined;

(function(module) {
  var __helpers = {
    provision_contracts: function(scope) {
      scope.__contracts = JSON.parse({{CONTRACTS}});

      for (var key in scope.__contracts) {
        var contract = scope.__contracts[key];
        scope[key] = Pudding.whisk(contract.abi, contract.binary);
        if (contract.address != null) {
          scope[key].deployed_address = contract.address;
        }
      }
    },
    set_provider: function(scope) {
      if ("{{HOST}}" != "" && "{{PORT}}" != "") {
        web3.setProvider(new web3.providers.HttpProvider("http://{{HOST}}:{{PORT}}"));
      } else {
        web3.setProvider(
          (function() {
            return eval("{{PROVIDER}}");
          })()
        );
      }
    }
  }

  // If we're in the browser, call the helpers using the global
  // (window) scope. If we're in node, export the helpers as a module.
  if (module == undefined || module == null) {
    __helpers.provision_contracts(window);
    __helpers.set_provider(window);
  } else {
    module.exports = __helpers;
  }
})(module);
