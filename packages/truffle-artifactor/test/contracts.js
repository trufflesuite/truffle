// Override Pudding
var assert = require("chai").assert;
var Pudding = require("../");
var temp = require("temp").track();
var path = require("path");
var solc = require("solc");
var fs = require("fs");
var TestRPC = require("ethereumjs-testrpc");
var Web3 = require("web3");
var Pudding = require("../");

// Compile first
var result = solc.compile(fs.readFileSync("./test/Example.sol", {encoding: "utf8"}), 1);
var compiled = result.contracts["Example"];
var abi = JSON.parse(compiled.interface);
var binary = compiled.bytecode;

// Setup
var provider = TestRPC.provider();
var web3 = new Web3();
web3.setProvider(provider)

var tests = function(contract_instantiator) {
  var Example;
  var accounts;

  before(function(done) {
    contract_instantiator(function(err, Ex) {
      Example = Ex;
      done(err);
    });
  });

  before(function(done) {
    web3.eth.getAccounts(function(err, accs) {
      accounts = accs;

      Example.defaults({
        from: accounts[0]
      });

      done(err);
    });
  });

  after(function(done) {
    temp.cleanupSync();
    done();
  });

  it("should get and set values via methods and get values via .call", function(done) {
    var example;
    Example.new().then(function(instance) {
      example = instance;
      return example.value.call();
    }).then(function(value) {
      assert.equal(value.valueOf(), 1, "Starting value should be 1");
      return example.setValue(5);
    }).then(function(tx) {
      return example.value.call();
    }).then(function(value) {
      assert.equal(value.valueOf(), 5, "Ending value should be five");
    }).then(done).catch(done);
  });

  it("should add extended functions when created with at()", function(done) {
    Example.extend({
      my_function: function(instance) {
        assert.equal(instance, this, "Function has incorrect scope!");
        done();
      }
    });

    assert.isUndefined(Example.my_function, "Function should not have been applied to the class");
    assert.isNotNull(Example.prototype.my_function, "Function should have been applied to the _extended attribute");

    var example = Example.at(Example.deployed_address);
    assert.isNotNull(example.my_function, "Function should have been applied to the instance");
    example.my_function(example);
  });

  it("should add extended functions when created with new()", function(done) {
    Example.extend({
      my_function: function(instance) {
        assert.equal(instance, this, "Function has incorrect scope!");
        done();
      }
    });

    Example.new().then(function(example) {
      assert.isNotNull(example.my_function, "Function should have been applied to the instance");
      example.my_function(example);
    }).catch(done);
  });

  it("shouldn't synchronize constant functions", function(done) {
    var example;
    Example.new(5).then(function(instance) {
      example = instance;
      return example.getValue();
    }).then(function(value) {
      assert.equal(value.valueOf(), 5, "Value should have been retrieved without explicitly calling .call()");
    }).then(done).catch(done);
  });

  it("should allow BigNumbers as input parameters, and not confuse them as transaction objects", function(done) {
    // BigNumber passed on new()
    var example = null;
    Example.new(web3.toBigNumber(30)).then(function(instance) {
      example = instance;
      return example.value.call();
    }).then(function(value) {
      assert.equal(value.valueOf(), 30, "Starting value should be 30");
      // BigNumber passed in a transaction.
      return example.setValue(web3.toBigNumber(25));
    }).then(function(tx) {
      return example.value.call();
    }).then(function(value) {
      assert.equal(value.valueOf(), 25, "Ending value should be twenty-five");
      // BigNumber passed in a call.
      return example.parrot.call(web3.toBigNumber(865));
    }).then(function(parrot_value) {
      assert.equal(parrot_value.valueOf(), 865, "Parrotted value should equal 865")
    }).then(done).catch(done);
  });
};

describe("Pudding loader + require", function() {
  tests(function(callback) {
    var dirPath = temp.mkdirSync({
      dir: path.resolve("./"),
      prefix: 'tmp-test-contract-'
    });

    Pudding.save({
      "Example": {
        abi: abi,
        binary: binary,
        address: "0xe6e1652a0397e078f434d6dda181b218cfd42e01"
      }
    }, dirPath, {removeExisting: true});

    var scope = {};

    var contract = require(path.join(dirPath, "Example.sol.js"));

    contract.setProvider(provider)

    callback(null, contract);
  });
});
