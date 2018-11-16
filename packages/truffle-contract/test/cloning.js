var debug = require("debug")("test:cloning"); // eslint-disable-line no-unused-vars
var assert = require("assert");
var util = require("./util");

// Clean up after solidity. Only remove solidity's listener,
// which happens to be the first.
process.removeListener(
  "uncaughtException",
  process.listeners("uncaughtException")[0] || function() {}
);

describe("Cloning", function() {
  var ExampleOne;
  var ExampleTwo;

  before("Compile and set up contracts", async function() {
    this.timeout(10000);

    ExampleOne = await util.createExample();
    debug("ExampleOne %o", ExampleOne);
    ExampleTwo = ExampleOne.clone();
  });

  it("produces two distinct objects", function() {
    assert(Object.keys(ExampleOne._json).length > 0);
    assert(Object.keys(ExampleTwo._json).length > 0);
    assert.notEqual(ExampleTwo._json, ExampleOne._json);
    assert.deepEqual(ExampleTwo._json, ExampleOne._json);
  });
});
