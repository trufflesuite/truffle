var fs = require("fs");
var m = require("module");
var path = require("path");
var vm = require("vm");

var Pudding = require("ether-pudding");
var PuddingLoader = require("ether-pudding/loader");

var _ = require("lodash");

var Exec = {
  file: function(config, file, done) {
    var self = this;

    if (path.isAbsolute(file) == false) {
      file = path.join(config.working_dir, file);
    }

    config.web3.eth.getAccounts(function(error, accounts) {
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

      var old_cwd = process.cwd();
      var old_dirname = __dirname;

      // Change current working directory to that of the project.
      process.chdir(config.working_dir);
      __dirname = process.cwd();

      var script_over = function(err) {
        process.chdir(old_cwd);
        __dirname = old_dirname;
        done(err);
      };

      var new_process = _.merge({}, process);
      new_process.exit = function(exit_code) {
        if (exit_code != null && exit_code != 0) {
          script_over(new Error("Script " + file + " exited with non-zero exit code: " + exit_code));
        } else {
          script_over();
        }
      };

      // Create a sandbox that looks just like the global scope.
      sandbox = _.merge(sandbox, global, {
        web3: config.web3,
        Pudding: Pudding,
        process: new_process,
        require: function(name) {
          if (name.indexOf("./") == 0 || name.indexOf("../") == 0) {
            return require(config.working_dir + name);
          } else if (fs.existsSync(config.working_dir + "node_modules/" + name)) {
            return require(config.working_dir + "node_modules/" + name)
          } else {
            return require(name);
          }
        },
        module: m,
        __filename: file,
        __dirname: __dirname
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
