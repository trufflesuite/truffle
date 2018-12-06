const assert = require("assert");
const unbox = require("../lib/commands/unbox");

describe("commands/unbox.js", () => {
  const invalidBoxFormats = [
    "//",
    "/truffle-box/bare-box",
    "//truffle-box/bare-box#web3-one",
    "//truffle-box/bare-box#web3-one:path/SubDir",
    "/bare/",
    "//bare#web3-one",
    "//bare#web3-one:path/SubDir"
  ];
  const absolutePaths = [
    "https://github.com/truffle-box/bare-box:/path/SubDir",
    "https://github.com/truffle-box/bare-box#web3-one:/path/subDir",
    "truffle-box/bare-box:/path/subDir",
    "truffle-box/bare-box#web3-one:/path/subDir",
    "bare:/path/subDir",
    "bare#web3-one:/path/subDir",
    "git@github.com:truffle-box/bare-box:/path/subDir",
    "git@github.com:truffle-box/bare-box#web3-one:/path/subDir"
  ];
  const validBoxInput = [
    "https://github.com/truffle-box/bare-box",
    "https://github.com/truffle-box/bare-box#web3-one",
    "truffle-box/bare-box",
    "truffle-box/bare-box#web3-one",
    "bare",
    "bare#web3-one",
    "git@github.com:truffle-box/bare-box",
    "git@github.com:truffle-box/bare-box#web3-one"
  ];
  const relativePaths = [
    "https://github.com/truffle-box/bare-box:path/SubDir",
    "https://github.com/truffle-box/bare-box#web3-one:path/subDir",
    "truffle-box/bare-box:path/subDir",
    "truffle-box/bare-box#web3-one:path/subDir",
    "bare:path/subDir",
    "bare#web3-one:path/subDir",
    "git@github.com:truffle-box/bare-box:path/subDir",
    "git@github.com:truffle-box/bare-box#web3-one:path/subDir"
  ];

  describe("run", () => {
    describe("Error handling", () => {
      it("throws when passed an invalid box format", () => {
        invalidBoxFormats.forEach(val => {
          assert.throws(
            () => {
              unbox.run({ _: [`${val}`] });
            },
            Error,
            "Error not thrown!"
          );
        });
      });

      it("throws when passed an absolute unbox path", () => {
        absolutePaths.forEach(path => {
          assert.throws(
            () => {
              unbox.run({ _: [`${path}`] });
            },
            Error,
            "Error not thrown!"
          );
        });
      });
    });

    it("runs when passed valid box input", done => {
      validBoxInput.forEach(val => {
        unbox.run({ _: [`${val}`], force: true }, _);
      });
      done();
    });

    it("runs when passed a relative unbox path", done => {
      relativePaths.forEach(path => {
        unbox.run({ _: [`${path}`], force: true }, _);
      });
      done();
    });
  });
});
