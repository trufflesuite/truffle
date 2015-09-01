var Mocha = require("mocha");
var chai = require("chai");
var dir = require("node-dir");
var path = require("path");
var web3 = require("web3");
var fs = require("fs");
var temp = require("temp");
var Promise = require("bluebird");

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

    // Deploy all configured contracts to the chain without recompiling
    var redeploy_contracts = function(recompile, done) {
      this && this.timeout && this.timeout(BEFORE_TIMEOUT);

      Contracts.deploy(config, recompile, function(err) {
        if (err != null) {
          // Format our error messages so they print better with mocha.
          if (err instanceof ExtendableError) {
            err.formatForMocha();
          }

          done(err);
          return;
        }

        Pudding.setWeb3(web3);
        PuddingLoader.load(config.environments.current.directory, Pudding, global, done);
      });
    };

    global.Truffle = {
      redeploy: redeploy_contracts,
      handle_errs: (done) => { Promise.onPossiblyUnhandledRejection(done); }
    };

    global.contract = function(name, opts, tests) {
      var always_redeploy = false;
      var recompile = false;
      if (arguments.length === 3) {
        if (opts) {
          if (opts.always_redeploy) {
            always_redeploy = true;
            //recompile = true;
          }
          if (opts.recompile) {
            recompile = true;
          }
        }
      } else {
        tests = opts;
      }

      describe(`Contract: ${name}`, function() {
        this.timeout(TEST_TIMEOUT);

        if (always_redeploy) {
          beforeEach("redeploy before each test", function(done) {
            redeploy_contracts.call(this, recompile, done);
          });
        } else {
          before("redeploy before each contract", function(done) {
            redeploy_contracts.call(this, recompile, done);
          });
        }

        tests(accounts);
      });
    };

    // Compile all the contracts and get the available accounts.
    // We only need to do this one, and can get it outside of
    // mocha.

    console.log("Compiling contracts...");

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

  // file must be absolute, or null.
  run(config, file, callback) {
    if (typeof file == "function") {
      callback = file;
      file = null;
      config.expect(config.tests.directory, "tests directory");
    } else {
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

        // if running via the 'watch:tests' task, we want to be able to run
        // (require) our test files repeatedly, so this is a hack to make it
        // work. we copy each test file to a temp filename and load that
        // instead of the original to avoid getting cached.
        files = files.map(function(f) {
          var src = fs.readFileSync(f);
          f = temp.path({prefix: "truffle-", suffix: "-"+path.basename(f)})
          fs.writeFileSync(f, src);
          return f;
        });

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
          files.forEach(function(f) {
            fs.unlinkSync(f); // cleanup our temp files
          });
          callback(null, failures);
        });
      });
    });
  }
};

module.exports = Test;
