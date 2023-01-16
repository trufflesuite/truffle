import assert from "assert";
import { describe, it } from "mocha";

const { WebpackTestHelper } = require("@truffle/webpack-test-helper");
const webpackTestHelper = new WebpackTestHelper("@truffle/code-utils");

import type { parseOpcode as ParseOpcodeFunction } from "../src/opcodes";
const { parseOpcode }: { parseOpcode: typeof ParseOpcodeFunction } =
  webpackTestHelper.require("./build/opcodes.js");

describe("opcode parsing method", function () {
  it(`returns "INVALID" when passed an invalid opcode`, function () {
    const returnValue = parseOpcode(0xbad);
    assert.strictEqual("INVALID", returnValue);
  });
});
