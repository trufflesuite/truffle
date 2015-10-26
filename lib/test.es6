var Mocha = require("mocha");
var chai = require("chai");
var dir = require("node-dir");
var path = require("path");

var Contracts = require("./contracts");

var Pudding = require("ether-pudding");
var PuddingLoader = require("ether-pudding/loader");
var loadconf = require("./loadconf");
var Promise = require("bluebird");

var ExtendableError = require("./errors/extendableerror");

// Make Promise global so tests have access to it.
global.Promise = Promise;

// Use custom assertions.
global.assert = chai.assert;
chai.use(require("./assertions"));

var Test = {
  setup(config, callback) {

    global.web3 = config.web3;

    // Variables that are passed to each contract which are
    // populated by the global before() hook.
    var accounts = [];

    var BEFORE_TIMEOUT = 120000;
    var TEST_TIMEOUT = 300000;

    global.contract = function(name, tests) {
      describe(`Contract: ${name}`, function() {
        this.timeout(TEST_TIMEOUT);

        before("redeploy before each contract", function(done) {
          this.timeout(BEFORE_TIMEOUT);

          // Redeploy contracts before each contract suite,
          // but don't recompile.
          Contracts.deploy(config, false, function(err) {
            if (err != null) {

              // Format our error messages so they print better with mocha.
              if (err instanceof ExtendableError) {
                err.formatForMocha();
              }

              done(err);
              return;
            }

            Pudding.setWeb3(config.web3);
            PuddingLoader.load(config.environments.current.directory, Pudding, global, done);
          });
        });

        tests(accounts);
      });
    };


    // Get the accounts
    web3.eth.getAccounts(function(error, accs) {
      for (var account of accs) {
        accounts.push(account);
      }

      Pudding.defaults({
        from: accounts[0],
        gas: 3141592
      });

      if (config.argv.compile === false) {
        callback();
        return;
      }

      // Compile all the contracts and get the available accounts.
      // We only need to do this once, and can get it outside of
      // mocha.
      console.log("Compiling contracts...");
      Contracts.compile_all(config, function(err) {
        if (err != null) {
          callback(err);
          return;
        }

        callback();
      });
    });
  },

  run(config, file, callback) {
    if (typeof file == "function") {
      callback = file;
      file = null;
      config.expect(config.tests.directory, "tests directory");
    }

    if (file != null) {
      if (path.isAbsolute(file) == false) {
        file = path.resolve(config.working_dir, file);
      }

      config.expect(file, "test file");
    }

    this.setup(config, function(err) {
      if (err != null) {
        callback(err);
        return;
      }

      // Change current working directory to that of the project.
      process.chdir(config.working_dir);
      __dirname = process.cwd();

      // If errors aren't caught in Promises, make sure they're thrown
      // and don't keep the process open.
      Promise.onPossiblyUnhandledRejection(function(e, promise) {
        throw e;
      });

      var mocha = new Mocha({
        useColors: true
      });

      var runMocha = function() {
        // TODO: Catch any errors here, and fail.
        mocha.run(function(failures) {
          callback(null, failures);
        });
      };

      if (file != null) {
        mocha.addFile(file);
        runMocha();
        return;
      }

      dir.files(config.tests.directory, function(err, files) {
        if (err != null) {
          callback(err);
          return;
        }

        for (var file of files.sort()) {
          mocha.addFile(file);
        }

        runMocha();
      });
    });
  }
};

module.exports = Test;
