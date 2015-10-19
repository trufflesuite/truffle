// This file represents code that gets inserted into the frontend
// at build time. It's also used within Node for provisioning the
// REPL. Items in {{ }} are replaced prior to execution.
// NOTE: This is ES5 code! (with our own gerryrigged template.)

// The following line is to prevent errors in the browser.
var module = module || undefined;

var __provisioner = {
  provision_contracts: function(scope, __Pudding) {
    if (__Pudding == null) {
      __Pudding = Pudding;
    }

    scope.__contracts = JSON.parse({{CONTRACTS}});

    for (var key in scope.__contracts) {
      var contract = scope.__contracts[key];
      scope[key] = __Pudding.whisk(contract.abi, contract.binary);
      if (contract.address != null) {
        scope[key].deployed_address = contract.address;
      }
    }
  },
  set_provider: function(scope, __web3) {
    if (__web3 == null) {
      __web3 = web3;
    }

    if ("{{HOST}}" != "" && "{{PORT}}" != "") {
      __web3.setProvider(new __web3.providers.HttpProvider("http://{{HOST}}:{{PORT}}"));
    } else {
      {{PROVIDER}}
    }
  }
}

// If we're in the browser, call the helpers using the global
// (window) scope. If we're in node, export the helpers as a module.
if (module != null) {
  module.exports = __provisioner;
}
