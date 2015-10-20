var fs = require("fs");
var m = require("module");
var path = require("path");

global.web3 = require("web3");
global.Pudding = require("ether-pudding");
Pudding.setWeb3(web3);

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
