const assert = require("assert");
const { shouldIncludePath } = require("@truffle/compile-solidity");

describe(".shouldIncludePath(filename)", () => {
  it("returns true if the file has a .sol extension", () => {
    const result = shouldIncludePath("jibberJabber.sol");
    assert(result);
  });
  it("returns true if the file has a .json extension", () => {
    const result = shouldIncludePath("iPityTheFool.json");
    assert(result);
  });
  it("returns false for other extensions", () => {
    const otherExtensions = [".js", ".ts", ".test.js", ".onion"];
    assert(
      !otherExtensions.some(extension => shouldIncludePath(`file${extension}`))
    );
  });
});
