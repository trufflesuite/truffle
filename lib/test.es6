var Mocha = require("mocha");
var chai = require("chai");
var dir = require("node-dir");
var path = require("path");
var fs = require("fs");
var temp = require("temp");

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
        PuddingLoader.load(config.environments.current.directory, Pudding, global, function(err, contract_names) {
          for (var name in config.contracts.classes) {
            var contract = global[name];
            var inst = contract.at(contract.deployed_address);
            Truffle.log_filters.push(inst.allEvents({fromBlock: 0, toBlock: 'latest'}, function(err, results) {
              // no-op, don't worry abuot tracking events just now
            }));
          }
          done();
        });
      });
    };

    var rpc = function(method, arg, cb) {
      var req = {
        jsonrpc: "2.0",
        method: method,
        id: new Date().getTime()
      };
      if (arguments.length == 3) {
        req.params = arg;
      } else {
        cb = arg;
      }
      web3.currentProvider.sendAsync(req, cb);
    };

    global.Truffle = {

      log_filters: [],

      redeploy: function(recompile, done) {
        return new Promise(function(resolve, reject) {
          redeploy_contracts(recompile, resolve);
        });
      },
      handle_errs: (done) => { Promise.onPossiblyUnhandledRejection(done); },

      reset: function(cb) {
        rpc("evm_reset", cb);
      },

      snapshot: function(cb) {
        rpc("evm_snapshot", cb);
      },

      revert: function(snapshot_id, cb) {
        rpc("evm_revert", [snapshot_id, true], cb);
      }
    };

    global.contract = function(name, opts, tests) {
      var reset_state = true;
      if (arguments.length === 3) {
        if (opts) {
          if (opts.reset_state) {
            reset_state = opts.reset_state;
          }
        }
      } else {
        tests = opts;
      }

      describe(`Contract: ${name}`, function() {
        this.timeout(TEST_TIMEOUT);

        var _original_contracts = {};

        before("redeploy before each suite", function(done) {
          redeploy_contracts.call(this, true, function() {

            // Store address that was first deployed, in case we redeploy
            // from within a test
            for (var name in config.contracts.classes) {
              var contract = global[name];
              _original_contracts[name] = contract.deployed_address;
            }

            done();
          });
        });

        after("clear all filters after each suite", function(done) {
          Truffle.log_filters.forEach(function(f) { f.stopWatching(); });
          Truffle.log_filters = [];
          done();
        });

        afterEach("restore contract address", function(done) {
          for (var name in _original_contracts) {
            global[name].deployed_address = _original_contracts[name];
          }
          done();
        });

        afterEach("check logs on failure", function(done) {
          if (this.currentTest.state == "failed") {

            var logs = [];
            Truffle.log_filters.forEach(function(filter) {
              try {
                logs = logs.concat(filter.get());
              } catch (e) {
                if (e.message.match(/Invalid parameters/)) {
                  // filter is invalid because the contract no longer exists
                  filter.stopWatching();
                }
              }
            });
            logs.sort(function(a, b) {
              var ret = a.blockNumber - b.blockNumber;
              if (ret == 0) {
                return a.logIndex - b.logIndex;
              }
              return ret;
            });

            if (logs.length > 0) {
              console.log("\n    Events emitted during test:");
              console.log(  "    ---------------------------");
              logs.forEach(function(log) {
                if (!log.event) {
                  return; // only want log events
                }
                if (log.event.toLowerCase() == "debug") {
                  console.log("[DEBUG]", log.args.msg);
                  return;
                }
                var data = {};
                for (var key in log.args) {
                  data[key] = log.args[key].toString();
                }
                console.log({event: log.event, data: data})
              });
              console.log(  "\n    --------------------------- END EVENTS");
            } else {
              console.log("    > No events were emitted");
            }


          }
          done();
        });

        if (reset_state) {
          var snapshot_id;
          beforeEach("snapshot state before each test", function(done) {
            Truffle.snapshot(function(err, ret) {
              snapshot_id = ret.result;
              done();
            });
          });

          afterEach("revert state after each test", function(done) {
            Truffle.revert(snapshot_id, function(err, ret) {
              done();
            });
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
