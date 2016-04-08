var repl = require("repl");

global.Pudding = require("ether-pudding");
var PuddingLoader = require("ether-pudding/loader");

var Repl = {
  run: function(config, done) {
    Pudding.setWeb3(config.web3);
    global.web3 = config.web3;
    PuddingLoader.load(config.environments.current.directory, Pudding, global, function() {
      try {
        var r = repl.start("truffle(" + config.environment + ")> ");
        r.on("exit", function() {
          process.exit(1);
        });
      } catch(e) {
        console.log(e.stack);
        process.exit(1);
      }
    });
  }
}

module.exports = Repl;
