const { assert } = require("chai");

const { shimBytecode } = require("truffle-workflow-compile/shims");

describe("shimBytecode", () => {
  it("removes 0x", function() {
    const bytes = "ffffffff";
    const expected = {
      bytes,
      linkReferences: []
    };

    assert.deepEqual(shimBytecode(`0x${bytes}`), expected);
  });

  it("externalizes a link reference in underscores format", function() {
    //                  0 1 2 3 4 5 6 7 8 9
    const bytecode = "0x00__hello_________00";

    const expected = {
      //      0 1 2 3 4 5 6 7 8 9
      bytes: "00000000000000000000",
      linkReferences: [
        {
          offsets: [1],
          length: 8,
          name: "hello"
        }
      ]
    };

    assert.deepEqual(shimBytecode(bytecode), expected);
  });

  it("externalizes two different link references", function() {
    //                  0 1 2 3 4 5 6 7 8 9
    const bytecode = "0x__hi____00__there_00";

    const expected = {
      //      0 1 2 3 4 5 6 7 8 9
      bytes: "00000000000000000000",
      linkReferences: [
        {
          offsets: [0],
          length: 4,
          name: "hi"
        },
        {
          offsets: [5],
          length: 4,
          name: "there"
        }
      ]
    };

    assert.deepEqual(shimBytecode(bytecode), expected);
  });
});
