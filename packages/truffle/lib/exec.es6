var fs = require("fs");
var m = require("module");
var path = require("path");
var vm = require("vm");

var Pudding = require("ether-pudding");
var PuddingLoader = require("ether-pudding/loader");

var _ = require("lodash");

var Exec = {
  file(config, file, done) {
    if (path.isAbsolute(file) == false) {
      file = path.join(config.working_dir, file);
    }

    config.web3.eth.getAccounts((error, accounts) => {
      if (error) {
        done(error);
        return;
      }

      Pudding.setWeb3(config.web3);

      Pudding.defaults({
        from: accounts[0],
        gas: 3141592
      });

      var sandbox = {};

      // Create a sandbox that looks just like the global scope.
      sandbox = _.merge(sandbox, global, {
        web3: config.web3,
        Pudding: Pudding,
        process: {
          exit: function(exit_code) {
            if (exit_code != null && exit_code != 0) {
              done(new Error(`Script ${file} exited with non-zero exit code: ${exit_code}`));
            } else {
              done();
            }
          }
        }
      });

      PuddingLoader.load(config.environments.current.directory, Pudding, sandbox, function(err) {
        if (err != null) {
          done(err);
          return;
        }

        var context = vm.createContext(sandbox);
        var code = fs.readFileSync(file);
        var script = new vm.Script(code, { filename: file});
        script.runInContext(context);
      });
    });
  }
}

module.exports = Exec
