var Mocha = require("mocha");
var chai = require("chai");
var dir = require("node-dir");
var web3 = require("web3");

var Contracts = require("./contracts");
var Provision = require("./provision");

var Pudding = require("ether-pudding");
var loadconf = require("./loadconf");
var Promise = require("bluebird");

// Use custom assertions.
global.assert = chai.assert;
chai.use(require("./assertions"));

var Test = {
  setup(config, callback) {
    // Variables that are passed to each contract which are
    // populated by the global before() hook.
    var accounts = []

    var BEFORE_TIMEOUT = 120000
    var TEST_TIMEOUT = 300000

    global.contract = function(name, tests) {
      describe(`Contract: ${name}`, function() {
        this.timeout(TEST_TIMEOUT);

        before("redeploy before each contract", function(done) {
          this.timeout(BEFORE_TIMEOUT);

          // Redeploy contracts before each contract suite,
          // but don't recompile.
          Contracts.deploy(config, false, function(err) {
            if (err != null) {
              done(err);
              return;
            }

            // Prepare the newly deployed contract classes, using the provisioner.
            loadconf(config.environments.current.contracts_filename, function(err, json) {
              config.contracts.classes = json;

              var provisioner = Provision.asModule(config);
              provisioner.provision_contracts(global);

              done();
            });


          });
        });

        tests(accounts);
      });
    };

    // Compile all the contracts and get the available accounts.
    // We only need to do this one, and can get it outside of
    // mocha.
    Contracts.compile_all(config, function(err) {
      if (err != null) {
        callback(err);
        return;
      }

      web3.eth.getAccounts(function(error, accs) {
        for (var account of accs) {
          accounts.push(account);
        }

        Pudding.defaults({
          from: accounts[0],
          gas: 3141592
        });

        callback();
      });
    });
  },

  run(config, callback) {
    config.expect(config.tests.directory, "tests directory");

    this.setup(config, function(err) {
      if (err != null) {
        callback(err);
        return;
      }

      dir.files(config.tests.directory, function(err, files) {
        if (err != null) {
          callback(err);
          return;
        }

        var mocha = new Mocha({
          useColors: true
        });

        for (var file of files.sort()) {
          mocha.addFile(file);
        }


        // Change current working directory to that of the project.
        process.chdir(config.working_dir);
        __dirname = process.cwd();

        // If errors aren't caught in Promises, make sure they're thrown
        // and don't keep the process open.
        Promise.onPossiblyUnhandledRejection(function(e, promise) {
          throw e;
        });

        // TODO: Catch any errors here, and fail.
        mocha.run(function(failures) {
          callback(null, failures);
        });
      });
    });
  }
};

module.exports = Test;
