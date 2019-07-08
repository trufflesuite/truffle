const { assert } = require("chai");

const { shimBytecode } = require("truffle-compile/legacy/shims");

describe("shimBytecode", () => {
  it("prepends 0x", function() {
    const bytes = "ffffffff";

    assert.equal(shimBytecode({ bytes }), `0x${bytes}`);
  });

  it("inlines an external link reference into underscores format", function() {
    const bytecode = {
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

    //                  0 1 2 3 4 5 6 7 8 9
    const expected = "0x00__hello_________00";

    assert.equal(shimBytecode(bytecode), expected);
  });

  it("inlines a link reference with multiple offsets", function() {
    const bytecode = {
      //      0 1 2 3 4 5 6 7 8 9
      bytes: "00000000000000000000",
      linkReferences: [
        {
          offsets: [0, 5],
          length: 4,
          name: "hi"
        }
      ]
    };

    //                  0 1 2 3 4 5 6 7 8 9
    const expected = "0x__hi____00__hi____00";

    assert.equal(shimBytecode(bytecode), expected);
  });

  it("inlines two different link references", function() {
    const bytecode = {
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

    //                  0 1 2 3 4 5 6 7 8 9
    const expected = "0x__hi____00__there_00";

    assert.equal(shimBytecode(bytecode), expected);
  });
});
