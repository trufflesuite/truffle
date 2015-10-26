var fs = require("fs");
var m = require("module");
var path = require("path");

global.Pudding = require("ether-pudding");
var PuddingLoader = require("ether-pudding/loader");

var Exec = {
  file(config, file, done) {
    if (path.isAbsolute(file) == false) {
      file = path.join(config.working_dir, file);
    }

    web3.eth.getAccounts((error, accounts) => {
      if (error) {
        done(error);
        return;
      }

      Pudding.setWeb3(config.web3);

      Pudding.defaults({
        from: accounts[0],
        gas: 3141592
      });

      PuddingLoader.load(config.environments.current.directory, Pudding, global, function(err) {
        if (err != null) {
          done(err);
        } else {
          require(file);
        }
      });
    });
  }
}

module.exports = Exec
