var repl = require("repl");

global.web3 = require("web3");
global.Pudding = require("ether-pudding");
Pudding.setWeb3(web3);

var PuddingLoader = require("ether-pudding/loader");

var Repl = {
  run(config, done) {
    PuddingLoader.load(config.environments.current.directory, Pudding, global, function() {
      try {
        var r = repl.start(`truffle(${config.environment})> `);
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
