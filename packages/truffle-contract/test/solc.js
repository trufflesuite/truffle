var assert = require("assert");
var solc = require("solc");
var contract = require("../");

describe("solc", function() {
  it("Will save files using input directly from solc", function(done) {
    this.timeout(5000);
    var result = solc.compile("contract A { function doStuff() {} } \n\n contract B { function somethingElse() {} }", 1);

    var data = result.contracts["A"];

    var A = contract(data);

    assert.deepEqual(A.abi, JSON.parse(data.interface));
    assert.equal(A.bytecode, "0x" + data.bytecode);
    assert.equal(A.runtimeBytecode, "0x" + data.runtimeBytecode);
    assert.equal(A.sourceMap, data.srcmap);
    assert.equal(A.runtimeSourceMap, data.srcmapRuntime);

    done();
  });
});
