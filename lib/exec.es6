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

    require(file);
  }
}

module.exports = Exec
