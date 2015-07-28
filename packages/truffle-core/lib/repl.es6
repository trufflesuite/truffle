var repl = require("repl");
var provision = require("./provision.coffee");

global.web3 = require("web3");
global.Pudding = require("ether-pudding");

var Repl = {
  run: function(config, done) {
    var provisioner = provision.asModule(config);
    provisioner.provision_contracts(global);

    try {
      var r = repl.start(`truffle(${config.environment})> `);
      r.on("exit", function() {
        process.exit(1);
      });
    } catch(e) {
      console.log(e.stack);
      process.exit(1);
    }
  }
}

module.exports = Repl;
