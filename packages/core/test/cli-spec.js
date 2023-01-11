const assert = require("chai").assert;
const { processForHelpFlag } = require("../cli.js");

describe("Truffle commandline help", () => {
  [
    { input: [], expected: [] },
    { input: ["help"], expected: [] },
    { input: ["--help"], expected: ["help"] },
    { input: ["test", "--help"], expected: ["help", "test"] },
    { input: ["--help", "db", "serve"], expected: ["help", "db", "serve"] },
    { input: ["db", "--help", "serve"], expected: ["help", "db", "serve"] },
    { input: ["db", "serve", "--help"], expected: ["help", "db", "serve"] }
  ].forEach(({ input, expected }) => {
    it(`parses truffle ${input.join(" ")}`, () => {
      assert.deepEqual(expected, processForHelpFlag(input), "should not fail");
    });
  });
});
