import assert from "assert";
import { Shims, Bytecode } from "../src";

describe("Shims.NewToLegacy.forBytecode", () => {
  it("handles undefined", () => {
    assert.equal(Shims.NewToLegacy.forBytecode(undefined), undefined);
  });

  it("prepends 0x", () => {
    const bytes = "ffffffff";

    assert.equal(
      Shims.NewToLegacy.forBytecode({ bytes, linkReferences: [] }),
      `0x${bytes}`
    );
  });

  it("inlines an external link reference into underscores format", () => {
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

    assert.equal(Shims.NewToLegacy.forBytecode(bytecode), expected);
  });

  it("inlines a link reference with multiple offsets", () => {
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

    assert.equal(Shims.NewToLegacy.forBytecode(bytecode), expected);
  });

  it("inlines two different link references", () => {
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

    assert.equal(Shims.NewToLegacy.forBytecode(bytecode), expected);
  });
});

describe("Shims.LegacyToNew.forBytecode", () => {
  it("removes 0x", function () {
    const bytes = "ffffffff";
    const expected = {
      bytes,
      linkReferences: []
    } as Bytecode;

    assert.deepEqual(Shims.LegacyToNew.forBytecode(`0x${bytes}`), expected);
  });

  it("externalizes a link reference in underscores format", function () {
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

    assert.deepEqual(Shims.LegacyToNew.forBytecode(bytecode), expected);
  });

  it("externalizes two different link references", function () {
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

    assert.deepEqual(Shims.LegacyToNew.forBytecode(bytecode), expected);
  });
});
