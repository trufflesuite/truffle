var CoffeeScript = require("coffee-script");
var fs = require("fs");
var m = require("module");
var path = require("path");
var provision = require("./provision");

global.web3 = require("web3");
global.Pudding = require("ether-pudding");

var Exec = {
  // NOTE: Executed files are expected to call process.exit()!
  // Otherwise they'll stay open.
  file(config, file, done) {
    var provisioner = provision.asModule(config);
    provisioner.provision_contracts(global);

    process.chdir(config.working_dir);

    module.filename = file;
    var dir = path.dirname(fs.realpathSync(file));

    for (var module_path in m._nodeModulePaths(dir)) {
      if (module.paths.indexOf(module_path) < 0) {
        module.paths.unshift(module_path);
      }
    }

    try {
      CoffeeScript.run(fs.readFileSync(file, {encoding: "utf8"}), {filename: file});
    } catch(e) {
      console.log(e.stack);
      process.exit(1);
    }
  }
}

module.exports = Exec
