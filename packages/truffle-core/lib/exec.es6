var fs = require("fs");
var m = require("module");
var path = require("path");
var provision = require("./provision");

global.web3 = require("web3");
global.Pudding = require("ether-pudding");

var Exec = {
  file(config, file, done) {
    var provisioner = provision.asModule(config);
    provisioner.provision_contracts(global);

    if (path.isAbsolute(file) == false) {
      file = path.join(process.cwd(), file);
    }

    web3.eth.getAccounts((error, accounts) => {
      if (error) {
        done(error);
      } else {

        Pudding.defaults({
          from: accounts[0],
          gas: 3141592
        });

        require(file);
      }
    });
  }
}

module.exports = Exec
