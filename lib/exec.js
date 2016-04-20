var path = require("path");
var requireNoCache = require("./require-nocache");
var Pudding = require("ether-pudding");
var PuddingLoader = require("ether-pudding/loader");

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

      var old_cwd = process.cwd();
      var old_dirname = __dirname;

      // Change current working directory to that of the project.
      process.chdir(config.working_dir);
      __dirname = process.cwd();

      var cleanup = function() {
        process.chdir(old_cwd);
        __dirname = old_dirname;
      };

      PuddingLoader.load(config.environments.current.directory, Pudding, global, function(err) {
        if (err != null) {
          cleanup();
          done(err);
          return;
        }

        var script = requireNoCache(path.resolve(file));

        // Callback is always the last argument.
        var args = [accounts, config.web3, Pudding];
        args = args.slice(0, script.length - 1);

        args.push(function(err) {
          cleanup();
          done(err);
        });

        script.apply(script, args);
      });
    });
  }
}

module.exports = Exec
