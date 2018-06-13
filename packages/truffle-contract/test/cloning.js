var assert = require("assert");
var temp = require("temp").track();
var path = require("path");
var solc = require("solc");

// Clean up after solidity. Only remove solidity's listener,
// which happens to be the first.
process.removeListener("uncaughtException", process.listeners("uncaughtException")[0]);

var fs = require("fs");
var requireNoCache = require("require-nocache")(module);
var debug = require("debug")("ganache-core");
var TestRPC = require("ganache-core");
var contract = require("../");
var async = require("async");
var Schema = require("truffle-contract-schema");

var log = {
  log: debug
};

describe("Cloning", function() {
  var network_one_id;
  var network_two_id;
  var ExampleOne;
  var ExampleTwo;

  before("Compile and set up contracts", function(done) {
    this.timeout(10000);

    // Compile first
    var result = solc.compile(fs.readFileSync("./test/Example.sol", {encoding: "utf8"}), 1);

    var compiled = result.contracts["Example"];

    network_one_id = 1000;
    network_two_id = 1001;
    network_one = TestRPC.provider({network_id: network_one_id, seed: network_one_id, logger: log});
    network_two = TestRPC.provider({network_id: network_two_id, seed: network_two_id, logger: log});

    ExampleOne = contract(compiled);
    ExampleTwo = ExampleOne.clone();

    done();
  });

  it("produces two distinct objects", function() {
    assert(Object.keys(ExampleOne._json).length > 0);
    assert(Object.keys(ExampleTwo._json).length > 0);
    assert.notEqual(ExampleTwo._json, ExampleOne._json);
    assert.deepEqual(ExampleTwo._json, ExampleOne._json);
  });

});
