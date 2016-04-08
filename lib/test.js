var Mocha = require("mocha");
var chai = require("chai");
var dir = require("node-dir");
var path = require("path");
var fs = require("fs");

var Contracts = require("./contracts");

var Pudding = require("ether-pudding");
var PuddingLoader = require("ether-pudding/loader");
var loadconf = require("./loadconf");
var Promise = require("bluebird");

var ExtendableError = require("./errors/extendableerror");

var SolidityCoder = require("web3/lib/solidity/coder.js");

chai.use(require("./assertions"));

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

  var intermediary = function(err, result) {
    if (err != null) {
      cb(err);
      return;
    }

    if (result.error != null) {
      cb(new Error("RPC Error: " + (result.error.message || result.error)));
      return;
    }

    cb(null, result);
  };

  web3.currentProvider.sendAsync(req, intermediary);
};

// Deploy all configured contracts to the chain without recompiling
var redeploy_contracts = function(config, recompile, done) {
  Contracts.deploy(config, recompile, function(err) {
    if (err != null) {
      // Format our error messages so they print better with mocha.
      if (err instanceof ExtendableError) {
        err.formatForMocha();
      }

      done(err);
      return;
    }

    Pudding.setWeb3(config.web3);
    PuddingLoader.load(config.environments.current.directory, Pudding, global, function(err, contract_names) {
      // Go through all abis and record events we know about.
      for (var i = 0; i < contract_names.length; i++) {
        var name = contract_names[i];
        Truffle.contracts[name] = global[name];

        var abi = global[name].abi;

        for (var j = 0; j < abi.length; j++) {
          var item = abi[j];

          if (item.type == "event") {
            var signature = item.name + "(" + item.inputs.map(function(param) {return param.type;}).join(",") + ")";

            Truffle.known_events["0x" + web3.sha3(signature)] = {
              signature: signature,
              abi_entry: item
            };
          }
        }
      }

      done();
    });
  });
};

var Test = {
  setup: function(config, callback) {
    var BEFORE_TIMEOUT = 120000;
    var TEST_TIMEOUT = 300000;

    // `accounts` will be populated before each contract()
    // invocation and passed to it so tests don't have to call it themselves.
    var accounts = [];

    global.web3 = config.web3;

    // Make Promise global so tests have access to it.
    global.Promise = Promise;

    // Use custom assertions.
    global.assert = chai.assert;

    global.Truffle = {
      can_snapshot: false,
      starting_snapshot_id: null,
      contracts: {},
      known_events: {},

      redeploy: function(recompile) {
        return new Promise(function(resolve, reject) {
          redeploy_contracts(config, recompile, function(err) {
            if (err != null) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
      },

      handle_errs: function(done) { Promise.onPossiblyUnhandledRejection(done); },

      reset: function(cb) {
        var self = this;
        this.revert(this.starting_snapshot_id, function(err, result) {
          if (err != null) {
            cb(err);
            return;
          }

          // Snapshot again, resetting the snapshot id.
          self.snapshot(function(err, result) {
            if (err != null) {
              cb(err);
              return;
            }

            Truffle.starting_snapshot_id = result.result;
            cb();
          });
        });
      },

      snapshot: function(cb) {
        rpc("evm_snapshot", cb);
      },

      revert: function(snapshot_id, cb) {
        rpc("evm_revert", [snapshot_id], cb);
      }
    };

    global.contract = function(name, opts, tests) {
      if (typeof opts == "function") {
        tests = opts;
        opts = {
          reset_state: false
        };
      }

      if (opts.reset_state == null) {
        opts.reset_state = false;
      }

      describe("Contract: " + name, function() {
        this.timeout(TEST_TIMEOUT);

        //var _original_contracts = {};

        before("reset evm before each suite", function(done) {
          this.timeout(BEFORE_TIMEOUT);

          if (Truffle.can_snapshot == false) {
            return done();
          }

          // If we can snapshot, but haven't yet deployed, let's
          // deploy for the first time.
          if (Truffle.starting_snapshot_id == null) {
            redeploy_contracts.call(this, config, false, function(err) {
              if (err != null) {
                done(err);
                return;
              }

              Truffle.snapshot(function(err, result) {
                if (err != null) {
                  done(err);
                  return;
                }

                Truffle.starting_snapshot_id = result.result;
                done();
              });
            });
          } else {
            Truffle.reset(done);
          }
        });

        before("redeploy before each suite", function(done) {
          this.timeout(BEFORE_TIMEOUT);

          // We don't need this step if we were able to reset.
          if (Truffle.can_snapshot == true) {
            return done();
          }

          redeploy_contracts.call(this, config, false, function(err) {

            // Store address that was first deployed, in case we redeploy
            // from within a test
            // for (var name in config.contracts.classes) {
            //   var contract = global[name];
            //   _original_contracts[name] = contract.address;
            // }

            done(err);
          });
        });

        // afterEach("restore contract address", function(done) {
        //   for (var name in _original_contracts) {
        //     global[name].address = _original_contracts[name];
        //   }
        //   done();
        // });

        var startingBlock;

        beforeEach("record block number of test start", function(done) {
          web3.eth.getBlockNumber(function(err, result) {
            if (err) return done(err);

            result = web3.toBigNumber(result);

            // Add one in base 10
            startingBlock = result.plus(1, 10);

            done();
          });
        });

        afterEach("check logs on failure", function(done) {
          if (this.currentTest.state != "failed") {
            return done();
          }
          var logs = [];

          // There's no API for eth_getLogs?
          rpc("eth_getLogs", [{
            fromBlock: "0x" + startingBlock.toString(16)
          }], function(err, result) {
            if (err) return done(err);

            var logs = result.result;

            if (logs.length == 0) {
              console.log("    > No events were emitted");
              return done();
            }

            console.log("\n    Events emitted during test:");
            console.log(  "    ---------------------------");
            console.log("");

            // logs.sort(function(a, b) {
            //   var ret = a.blockNumber - b.blockNumber;
            //   if (ret == 0) {
            //     return a.logIndex - b.logIndex;
            //   }
            //   return ret;
            // });


            logs.forEach(function(log) {
              var event = Truffle.known_events[log.topics[0]];

              if (event == null) {
                return;
              }

              var types = event.abi_entry.inputs.map(function(input) {
                return input.indexed == true ? null : input.type;
              }).filter(function(type) {
                return type != null;
              });
              var values = SolidityCoder.decodeParams(types, log.data.replace("0x", ""));
              var index = 0;

              var line = "    " + event.abi_entry.name + "(";
              line += event.abi_entry.inputs.map(function(input) {
                var value;
                if (input.indexed == true) {
                  value = "<indexed>";
                } else {
                  value = values[index];
                  index += 1;
                }

                return input.name + ": " + value.toString();
              }).join(", ");
              line += ")";
              console.log(line);
            });
            console.log(  "\n    ---------------------------");
            done();
          });
        });

        if (opts.reset_state == true) {
          var snapshot_id;
          beforeEach("snapshot state before each test", function(done) {
            if (!Truffle.can_snapshot) {
              // can't snapshot/revert, redeploy instead
              return redeploy_contracts(false, done);
            }
            Truffle.snapshot(function(err, result) {
              snapshot_id = result.result;
              done();
            });
          });

          afterEach("revert state after each test", function(done) {
            if (!Truffle.can_snapshot) {
              return done();
            }
            Truffle.revert(snapshot_id, function(err, ret) {
              done();
            });
          });
        }

        tests(accounts);
      });
    };

    (new Promise(function(accept, reject) {
      // Get the accounts
      web3.eth.getAccounts(function(error, accs) {
        if (error != null) {
          reject(error);
          return;
        }

        for (var account of accs) {
          accounts.push(account);
        }

        Pudding.defaults({
          from: accounts[0],
          gas: 3141592
        });

        accept();
      });
    })).then(function() {
      return new Promise(function(accept, reject) {
        // Compile if needed.

        if (config.argv.compile === false) {
          accept();
          return;
        }

        // Compile all the contracts and get the available accounts.
        // We only need to do this once, and can get it outside of
        // mocha.
        console.log("Compiling contracts...");
        Contracts.compile(config, function(err) {
          if (err != null) {
            reject(err);
          } else {
            accept();
          }
        });
      });
    }).then(function() {
      return new Promise(function(accept, reject) {
        // Check to see if the ethereum client can snapshot
        Truffle.snapshot(function(err, result) {
          if (err == null) {
            Truffle.can_snapshot = true;
          }
          accept();
        });
      });
    }).then(callback).catch(callback);
  },

  run: function(config, file, callback) {
    // Override console.warn() because web3 outputs gross errors to it.
    // e.g., https://github.com/ethereum/web3.js/blob/master/lib/web3/allevents.js#L61
    // Output looks like this during tests: https://gist.github.com/tcoulter/1988349d1ec65ce6b958
    var warn = console.warn;
    console.warn = function(message) {
      if (message == "cannot find event for log") {
        return;
      } else {
        warn.apply(console, arguments);
      }
    };

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

      var mocha = new Mocha(config.app.resolved.mocha || {
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
        // files = files.map(function(f) {
        //   var src = fs.readFileSync(f);
        //   f = temp.path({prefix: "truffle-", suffix: "-"+path.basename(f)})
        //   fs.writeFileSync(f, src);
        //   return f;
        // });

        var mocha = new Mocha(config.app.resolved.mocha || {
          useColors: true
        });

        for (var file of files.sort()) {
          if (file.match(config.tests.filter)) {
            mocha.addFile(file);
          }
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
          // files.forEach(function(f) {
          //   fs.unlinkSync(f); // cleanup our temp files
          // });
          console.warn = warn;
          callback(null, failures);
        });
      });
    });
  }
};

module.exports = Test;
